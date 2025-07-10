import { Socket } from "socket.io";
import { reqData } from "../interface/interface";
import { placeBet } from "../modules/bets/betSession";

export const messageRoute = async (socket: Socket): Promise<void> => {
    try {
        socket.on('message', async (msg: string) => {
            const result = msg.split(':');
            const eventName = result[0].toLowerCase();
            const data: reqData = { btAmt: Number(result[1]) };
            if (eventName === 'pb') {
                await placeBet(socket, data);
            } else {
                console.warn(`Unknown event received: ${eventName}`);
            }
        });
    } catch (err: any) {
        console.log('Error from message router', err.message);
    };
};