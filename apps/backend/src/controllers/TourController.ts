import { AuthenticationRequest } from "../middlewares/authMiddleware";
import io from 'socket.io'


export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number):number => {
    const R = 6371; // km
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
        return Infinity; // Handle null values appropriately
    }


    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000; // distance in meters
    
}
interface NearbyUsersRequestBody {
    latitude: number;
    longitude: number;
}
interface NearbyUsersResult {
    id:string;
    username:string;
    name:string|null;
    distance_meters:number
}
export const findNearbyUsers = async (req:AuthenticationRequest,res:Response):Promise<void>=>{
    try{
        const currentUserId = req.user?.id

    }catch(error){

    }
}

export const generateTourPlan = async (req: AuthenticationRequest, res: Response) => {
    try {

    } catch (error) {

    }
}