import { Response } from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { prisma } from "../utils/utils"; // Adjust path
import { AuthenticationRequest } from '@/middlewares/authMiddleware'; // Adjust path
import * as z from 'zod'; // Import zod for validation (used in updateUserPreferences)

// --- Initialize Google AI Client ---
// ... (keep as before)
if (!process.env.GEMINI_API_KEY) { console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set."); }
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const modelName = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash-latest";

// --- Type Helper for Preferences (can be imported) ---
interface UserPreferences {
    pace?: 'relaxed' | 'moderate' | 'fast-paced' | null;
    budget?: 'budget-friendly' | 'mid-range' | 'luxury' | null;
    interests?: string[];
    accommodation?: string[];
}

// --- Define expected request body shape for GENERATION (only location) ---
interface GeneratePlanRequest {
    location: string;
    // Preferences are NOT expected here anymore
}

// --- Define expected output structure from Gemini ---
interface ScheduleItem {
    time_slot: string;
    activity_title: string;
    description: string;
    local_insight: string;
    estimated_duration_minutes: number;
    budget_indicator: string;
    transport_suggestion?: string;
}

interface GeneratedOneDayPlan {
    plan_title: string;         // <-- Make sure this exists
    location: string;
    date_applicable: string;    // <-- Make sure this exists
    plan_summary: string;       // <-- Make sure this exists
    schedule: ScheduleItem[];
}


// --- Controller Function for Plan Generation ---
export const generateTourPlanWithGemini = async (req: AuthenticationRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
    }

    // --- Validate Request Body (Only Location Needed) ---
    const { location } = req.body as GeneratePlanRequest; // Only expect location

    if (!location || typeof location !== 'string' || location.trim() === '') {
        res.status(400).json({ success: false, message: 'Valid location string is required.' });
        return;
    }
    const sanitizedLocation = location.trim();
    const durationDays = 1; // Fixed duration

    try {
        // --- 1. Fetch User Preferences from Database ---
        console.log(`[generateTourPlan] Fetching preferences for user ${userId}`);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { preferences: true }
        });

        // ** Check if preferences exist and have essential data (interests) **
        if (!user || !user.preferences || typeof user.preferences !== 'object') {
             console.warn(`[generateTourPlan] Preferences not found or invalid for user ${userId}`);
             res.status(400).json({ success: false, message: 'User preferences not set or invalid. Please set them first.' });
             return; // Exit
        }

        // Assert or validate the fetched preferences structure
        const prefs = user.preferences as UserPreferences;

        if (!prefs.interests || !Array.isArray(prefs.interests) || prefs.interests.length === 0) {
             console.warn(`[generateTourPlan] User ${userId} preferences lack 'interests'. Prefs:`, prefs);
             res.status(400).json({ success: false, message: 'Your saved preferences must include at least one interest.' });
             return; // Exit
        }

        // --- 2. Prepare Variables for Prompt (using DB prefs) ---
        const interestsString = prefs.interests.join(', ');
        const paceString = prefs.pace || 'moderate'; // Use default if null/missing
        const budgetString = prefs.budget || 'mid-range'; // Use default if null/missing

        console.log(`[generateTourPlan] Using DB Prefs for user ${userId} | Location: ${sanitizedLocation} | Interests: ${interestsString} | Pace: ${paceString} | Budget: ${budgetString}`);


        // --- 3. Craft the Gemini Prompt using DB Prefs ---
        const prompt = `
Act as an expert local guide and travel planner for ${sanitizedLocation}. Your task is to create an immersive, culturally rich, and highly engaging one-day itinerary for a tourist visiting for the first time. The plan should provide a fantastic exploration experience, blending iconic landmarks (if essential) with authentic local spots, hidden gems, and experiences that showcase the city's diverse culture, reflecting insights typically known only by locals.

The tourist's preferences (retrieved from their profile) are:
- Interests: ${interestsString}
- Preferred Pace: ${paceString}
- Budget Level: ${budgetString}

**Output Requirements:**

Generate the itinerary **strictly** in the following JSON format. Do **not** include any introductory text, explanations, greetings, or markdown formatting outside the JSON structure itself. Only output the valid JSON object.

**JSON Structure:**

{
  "plan_title": "String: Catchy title (e.g., 'Authentic Day in ${sanitizedLocation}').",
  "location": "${sanitizedLocation}",
  "date_applicable": "String: Best days/general applicability.",
  "plan_summary": "String: 1-2 sentence summary.",
  "schedule": [
    {
      "time_slot": "String: Time block (e.g., 'Morning (9AM-12PM)').",
      "activity_title": "String: Concise activity title.",
      "description": "String: Detailed description with specifics.",
      "local_insight": "String: Practical tip or local secret.",
      "estimated_duration_minutes": "Number: Duration in minutes.",
      "budget_indicator": "String: ('Free', '$', '$$', '$$$').",
      "transport_suggestion": "String: Optional transport tip."
    }
    // Add more schedule objects...
  ]
}

**Instructions for Content Generation:**

1.  Relevance: Match interests: ${interestsString}.
2.  Local & Cultural Focus: Include authentic spots, markets, explain context for ${sanitizedLocation}.
3.  Blend: Balance landmarks and hidden gems.
4.  Pace Adaptation: Adjust activities based on pace: ${paceString}.
5.  Budget Consideration: Align suggestions with budget: ${budgetString}.
6.  Logistics: Consider travel time, provide transport suggestions.
7.  Actionable Detail: Be specific.
8.  "Local Insight" Value: Ensure it's genuinely useful.
9.  JSON Only: Output only the valid JSON object. 
        `; // End of prompt

        // --- 4. Call the Gemini API ---
        console.log(`[generateTourPlan] Sending prompt to Gemini model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model:"gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const response = result.response;
        if (!response) throw new Error("AI model did not return a response.");
        const responseText = response.text();
        console.log(`[generateTourPlan] Gemini response received.`);
        let cleanedJsonText = responseText.trim();
        const jsonMatch = cleanedJsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            console.log("[generateTourPlan] JSON found within markdown, extracting...");
            cleanedJsonText = jsonMatch[1].trim(); // Use the content inside backticks
        } else {
             // Optional Fallback: Try removing potential leading/trailing non-JSON characters
             // Find the first '{' and the last '}'
             const firstBrace = cleanedJsonText.indexOf('{');
             const lastBrace = cleanedJsonText.lastIndexOf('}');
             if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                 // If curly braces found, try extracting the content between them
                 const potentialJson = cleanedJsonText.substring(firstBrace, lastBrace + 1);
                 // Basic check if it looks like JSON before using it
                 if (potentialJson.length > 2) { // Avoid using just "{}"
                    console.log("[generateTourPlan] Attempting to clean prefix/suffix, using content between braces.");
                    cleanedJsonText = potentialJson;
                 } else {
                     console.log("[generateTourPlan] Found braces, but content seems too short. Using original trimmed text.");
                 }
             } else {
                 console.log("[generateTourPlan] No markdown or clear JSON boundaries detected. Using original trimmed text.");
             }
        }

        // Log the text we are *actually* attempting to parse
        console.log("--- Attempting to parse cleaned text ---");
        console.log(cleanedJsonText);
        console.log("----------------------------------------");

        // Attempt to parse the potentially cleaned text

        // --- 5. Parse and Validate the Response ---
        let generatedPlan: GeneratedOneDayPlan;
        try {
            console.log('THIS IS THE GENERATED PLAN ',cleanedJsonText);
            generatedPlan = JSON.parse(cleanedJsonText);
            
             if (!generatedPlan?.plan_title || !generatedPlan.location || !Array.isArray(generatedPlan.schedule)) {
                 throw new Error("Parsed JSON missing required fields.");
            }
            console.log(`[generateTourPlan] Successfully parsed Gemini JSON response.`);
        } catch (parseError: any) {
            console.error("[generateTourPlan] Failed to parse Gemini response:", parseError, "\nRaw:", responseText);
            throw new Error(`AI response format error: ${parseError.message}`);
        }

        // --- 6. Save the Generated Plan to Database ---
        const savedPlan = await prisma.tourPlan.create({
            data: {
                creator: { connect: { id: userId } },
                // *** FIX: Use Type Assertion ***
                planData: generatedPlan as any, // or generatedPlan as Prisma.InputJsonObject
                members: { connect: [{ id: userId }] },
            },
            select: { id: true }
        });
   
         console.log(`[generateTourPlan] Saved plan ID: ${savedPlan.id} for user ${userId}`);

        // --- 7. Optionally Update User's Active Plan ---
        const makeActive = true;
        if (makeActive) {
            await prisma.user.update({ where: { id: userId }, data: { activeTourPlanid: savedPlan.id } });
            console.log(`[generateTourPlan] Set plan ${savedPlan.id} as active for user ${userId}`);
        }

        // --- 8. Return Success Response ---
        res.status(201).json({
            success: true,
            message: 'Tour plan generated and saved successfully.',
            plan: generatedPlan,
            planId: savedPlan.id
        });

    } catch (error: any) {
        console.error(`[generateTourPlan] Overall Error for user ${userId}:`, error);
        let errorMessage = 'Failed to generate tour plan.';
        if (error.message?.includes('SAFETY')) errorMessage = 'Plan generation blocked due to content safety.';
        else if (error.message?.includes('format error') || error.message?.includes('JSON structure')) errorMessage = 'AI response format error.';
        else if (error.message?.includes('API key') || error.message?.includes('authentication')) errorMessage = 'AI service connection error.';
        else if (error.code === 'P2025') errorMessage = 'User not found for saving plan.';
        // Handle preference check errors specifically
        else if (error.message?.includes('preferences not set') || error.message?.includes('interests required')) {
              res.status(400).json({ success: false, message: error.message });
            return
            }
        res.status(500).json({ success: false, message: errorMessage });
    }
};


// --- Zod Schema Definition for updateUserPreferences ---
const preferencesSchema = z.object({
    pace: z.enum(['relaxed', 'moderate', 'fast-paced']).optional().nullable(),
    budget: z.enum(['budget-friendly', 'mid-range', 'luxury']).optional().nullable(),
    interests: z.array(z.string().min(1)).optional(),
    accommodation: z.array(z.string().min(1)).optional(),
});

// --- Controller Function to Update Preferences (keep as before) ---
export const updateUserPreferences = async (req: AuthenticationRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, message: 'Authentication required.' }); return; }
    try {
        const validationResult = preferencesSchema.safeParse(req.body);
        if (!validationResult.success) { /* ... 400 validation error ... */ return; }
        const validatedPreferences = validationResult.data;
        const dataToUpdate = {
             pace: validatedPreferences.pace ?? null,
             budget: validatedPreferences.budget ?? null,
             interests: validatedPreferences.interests ?? [],
             accommodation: validatedPreferences.accommodation ?? [],
        };
        console.log(`[updateUserPreferences] Updating preferences for user ${userId}:`, dataToUpdate);
        const updatedUser = await prisma.user.update({
            where: {
                id: userId // Target the specific user by their unique ID
            },
            data: {
                // Set the 'preferences' field (defined as Json in schema)
                // to the validated and prepared 'dataToUpdate' object.
                // Prisma handles serializing the JS object into JSON for the DB.
                preferences: dataToUpdate,
            },
            select: {
                // Select the fields you want to return in the response
                id: true,           // Good practice to confirm which user was updated
                preferences: true, // Return the newly saved preferences object
            }
        });

        res.status(200).json({ success: true, message: "Preferences updated.", data: updatedUser.preferences });
    }catch (error: any) {
        console.error(`[updateUserPreferences] Error for user ${userId}:`, error);
        if (error.code === 'P2025') {
            res.status(404).json({ success: false, message: "User not found." });
        } else {
            res.status(500).json({ success: false, message: 'Internal server error updating preferences.' });
        }
        // No explicit return needed here as response is sent in branches
    }
};
