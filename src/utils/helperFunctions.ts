import { Card, HandType, reqData } from "../interface/interface";

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
    return deck
};

function shuffleDeck(deck: Card[]): Card[] {
    for (let j = deck.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [deck[j], deck[k]] = [deck[k], deck[j]];
    }
    return deck
}


function evaluateHands(): {
    handType: HandType,
    hand: Card[]
} {
    const deck = shuffleDeck(createDeck());
    const hand = deck.slice(0, 3);

    const nums = hand.map(card => card.num).sort((a, b) => a - b);
    const suitsDrawn = hand.map(card => card.suit);

    const [num1, num2, num3] = nums;
    const flush = suitsDrawn[0] === suitsDrawn[1] && suitsDrawn[1] === suitsDrawn[2];
    const straight = num2 === num1 + 1 && num3 === num2 + 1;
    const threeOfKind = num1 === num2 && num2 === num3;
    const pair = num1 === num2 || num2 === num3 || num1 === num3;
    const straightFlush = flush && straight;

    let handType: HandType = '';
    if (threeOfKind) handType = 'three_of_a_kind';
    if (pair) handType = 'pair';
    if (straightFlush) handType = 'straight_flush';
    if (flush) handType = 'flush';
    if (straight) handType = 'straight';
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
    const win = multiplier > 0;
    const status: "win" | "loss" = win ? "win" : "loss";

    return {
        betAmt: data.btAmt,
        winAmt: win ? data.btAmt * multiplier : 0.00,
        mult: multiplier ? multiplier : 0.00,
        status,
        handType: handType,
        result: hand
    };
};
