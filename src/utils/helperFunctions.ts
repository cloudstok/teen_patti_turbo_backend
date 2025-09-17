import { Card, HandType, reqData } from "../interface/interface";
import { appConfig } from "./appConfig";

const suits = ['H', 'S', 'C', 'D'];

export const getUserIP = (socket: any): string => {
    const forwardedFor = socket.handshake.headers?.['x-forwarded-for'];
    if (forwardedFor) {
        const ip = forwardedFor.split(',')[0].trim();
        if (ip) return ip;
    }
    return socket.handshake.address || '';
};

function createDeck(): Card[] {
    const deck: Card[] = [];
    for (let suit of suits) {
        for (let num = 1; num <= 13; num++) {
            deck.push({ suit, num });
        }
    };
    return deck;
};

function shuffleDeck(deck: Card[]): Card[] {
    for (let j = deck.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [deck[j], deck[k]] = [deck[k], deck[j]];
    }
    return deck;
}


function evaluateHands(): {
    handType: HandType,
    hand: Card[]
} {
    const deck = shuffleDeck(createDeck());

    const hand = []

    const randomCards: string[] = [];
    
    while (hand.length < 3) {
        const card = deck[Math.floor(Math.random() * 52)]
        const concat = `${card.num}+${card.suit}`;
        if (!randomCards.includes(concat)) {
            randomCards.push(concat);
            hand.push(card);
        }
    }

    const nums = hand.map(card => card.num).sort((a, b) => a - b);
    const suitsDrawn = hand.map(card => card.suit);

    const [num1, num2, num3] = nums;
    const flush = suitsDrawn[0] === suitsDrawn[1] && suitsDrawn[1] === suitsDrawn[2];
    const straight = ( num2 === num1 + 1 && num3 === num2 + 1) || (num1 === 1 && num2 === 12 && num3 === 13);
    const threeOfKind = num1 === num2 && num2 === num3;
    const pair = num1 === num2 || num2 === num3 || num1 === num3;
    const straightFlush = flush && straight;

    let handType: HandType = '';
    if (threeOfKind) handType = 'three_of_a_kind';
    else if (straightFlush) handType = 'straight_flush';
    else if (straight) handType = 'straight';
    else if (flush) handType = 'flush';
    else if (pair) handType = 'pair';
    return { handType, hand };
};


export const calculateWinnings = (data: reqData) => {
    const { handType, hand } = evaluateHands();

    enum payoutMap {
        pair = 2,
        flush = 5,
        straight = 6,
        three_of_a_kind = 30,
        straight_flush = 50
    }

    const multiplier = handType ? payoutMap[handType] : 0;
    const status: "win" | "loss" = multiplier ? "win" : "loss";
    const maxCashout = Number(appConfig.maxCashoutAmount);

    return {
        betAmt: data.btAmt,
        winAmt: multiplier ? Math.min(maxCashout, data.btAmt * multiplier) : 0,
        mult: multiplier ? multiplier : 0,
        status,
        handType: handType,
        result: hand
    };
};
