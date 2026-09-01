export type TermKey = 
  | 'Call' 
  | 'Put' 
  | 'Strike Price' 
  | 'Expiration' 
  | 'Bid' 
  | 'Ask' 
  | 'Bid/Ask Spread' 
  | 'Intrinsic Value' 
  | 'Extrinsic Value' 
  | 'Delta' 
  | 'Gamma' 
  | 'Theta' 
  | 'Theta' 
  | 'Vega' 
  | 'Rho' 
  | 'Implied Volatility' 
  | 'Open Interest' 
  | 'Volume'
  | 'Break-Even'
  | 'Time Decay'
  | 'Days to Expiration'
  | 'Long Call'
  | 'Long Put'
  | 'Covered Call'
  | 'Cash-Secured Put'
  | 'Bull Call Spread'
  | 'Bear Put Spread'
  | 'Bull Put Spread'
  | 'Bear Call Spread';

export interface Explanation {
  technical: string;
  simple: string;
  whyItMatters: string;
  positionSpecific?: (quantity: number, value?: number) => string;
}

export const educationalDictionary: Record<TermKey, Explanation> = {
  'Call': {
    technical: 'An options contract that gives the buyer the right, but not the obligation, to buy the underlying asset at a specified strike price on or before a specified date.',
    simple: 'A contract that lets you buy a stock at a locked-in price, hoping the stock goes up.',
    whyItMatters: 'Buying a call is a defined-risk way to bet that a stock will increase in value.',
    positionSpecific: (quantity) => `You hold ${quantity} call contracts, controlling ${quantity * 100} shares of the underlying stock.`
  },
  'Put': {
    technical: 'An options contract that gives the buyer the right, but not the obligation, to sell the underlying asset at a specified strike price on or before a specified date.',
    simple: 'A contract that lets you sell a stock at a locked-in price, hoping the stock goes down.',
    whyItMatters: 'Buying a put is a defined-risk way to bet that a stock will decrease in value or to protect an existing stock position.',
    positionSpecific: (quantity) => `You hold ${quantity} put contracts, representing the right to sell ${quantity * 100} shares of the underlying stock.`
  },
  'Strike Price': {
    technical: 'The set price at which an option contract can be exercised.',
    simple: 'The target price you locked in to buy or sell the stock.',
    whyItMatters: 'It determines whether the option is in-the-money or out-of-the-money, fundamentally driving its value.'
  },
  'Expiration': {
    technical: 'The exact date and time when an options contract becomes void and ceases to exist.',
    simple: 'The expiration date for your bet. If the stock doesn\'t hit your target by this date, the option expires worthless.',
    whyItMatters: 'Options are wasting assets. Time decay (Theta) accelerates as the expiration date approaches.'
  },
  'Bid': {
    technical: 'The highest price a buyer is currently willing to pay for an options contract.',
    simple: 'The price you will get if you want to sell this option right now.',
    whyItMatters: 'If you are looking to close a long position or open a short one, this is the market price you receive.'
  },
  'Ask': {
    technical: 'The lowest price a seller is currently willing to accept for an options contract.',
    simple: 'The price you have to pay if you want to buy this option right now.',
    whyItMatters: 'If you are looking to open a long position or close a short one, this is the market price you pay.'
  },
  'Bid/Ask Spread': {
    technical: 'The difference between the Bid and Ask prices of an options contract.',
    simple: 'The hidden fee of trading. A wider spread means it costs more just to enter and exit the trade.',
    whyItMatters: 'A wide spread indicates low liquidity, making it harder to get a fair price.'
  },
  'Intrinsic Value': {
    technical: 'The in-the-money portion of an option\'s premium. For a call, it is (Underlying Price - Strike Price). For a put, it is (Strike Price - Underlying Price).',
    simple: 'The actual real-world value the option has right now if you were to exercise it immediately.',
    whyItMatters: 'Options with intrinsic value are less risky because their value isn\'t purely based on time and hope.'
  },
  'Extrinsic Value': {
    technical: 'The portion of an option\'s premium that exceeds its intrinsic value, composed of time value and implied volatility.',
    simple: 'The "hope" value. It is the extra premium you pay for the possibility that the option will increase in value before expiration.',
    whyItMatters: 'This value decays to exactly zero by expiration day. If you buy an option, this works against you.'
  },
  'Delta': {
    technical: 'The theoretical estimate of how much an option\'s price will change given a $1 change in the underlying asset.',
    simple: 'If the stock moves up by $1, the option\'s price will change by this much.',
    whyItMatters: 'Delta is often used as a rough proxy for the probability that the option will expire in-the-money.',
    positionSpecific: (quantity, value) => {
      if (value === undefined) return '';
      const totalImpact = (value * quantity * 100).toFixed(2);
      return `For every $1 the stock moves up, your total position changes by approximately $${totalImpact}. Note: this is a sensitivity, not a guarantee.`;
    }
  },
  'Gamma': {
    technical: 'The rate of change in Delta for every $1 move in the underlying asset.',
    simple: 'The accelerator pedal for Delta. It tells you how fast your Delta will grow or shrink as the stock moves.',
    whyItMatters: 'High Gamma means your risk and reward change very quickly with small stock movements.',
    positionSpecific: (quantity, value) => {
      if (value === undefined) return '';
      const totalGamma = (value * quantity * 100).toFixed(2);
      return `For every $1 move in the stock, your total position Delta will change by ${totalGamma}. Note: this is a sensitivity, not a guarantee.`;
    }
  },
  'Theta': {
    technical: 'The theoretical daily decay in the value of an options contract due to the passage of time.',
    simple: 'The amount of money this option loses every single day just by sitting there.',
    whyItMatters: 'Time works against option buyers and in favor of option sellers.',
    positionSpecific: (quantity, value) => {
      if (value === undefined) return '';
      const totalDecay = (Math.abs(value) * quantity * 100).toFixed(2);
      return `Your position loses approximately $${totalDecay} in value every day due to time decay. Note: this is a sensitivity, not a guarantee.`;
    }
  },
  'Vega': {
    technical: 'The amount by which an option\'s price will change for a 1% change in implied volatility.',
    simple: 'How sensitive the option is to changes in market fear or expectations (volatility).',
    whyItMatters: 'If you buy an option and volatility drops, the option can lose value even if the stock price goes your way.',
    positionSpecific: (quantity, value) => {
      if (value === undefined) return '';
      const totalVega = (value * quantity * 100).toFixed(2);
      return `If implied volatility increases by 1%, your position gains approximately $${totalVega}. Note: this is a sensitivity, not a guarantee.`;
    }
  },
  'Rho': {
    technical: 'The theoretical change in an option\'s price for a 1% change in interest rates.',
    simple: 'How much the option price will change if interest rates change.',
    whyItMatters: 'Typically the least important Greek unless interest rates are changing rapidly or you are trading very long-term options.'
  },
  'Implied Volatility': {
    technical: 'The market\'s forecast of a likely movement in a security\'s price, embedded in the option\'s premium.',
    simple: 'How wild the market expects the stock to swing. High IV means expensive options; low IV means cheap options.',
    whyItMatters: 'Buying when IV is high is dangerous because if the market calms down, your options lose value rapidly (IV Crush).'
  },
  'Open Interest': {
    technical: 'The total number of outstanding option contracts that have not been settled or closed.',
    simple: 'The total number of active contracts currently held by all traders.',
    whyItMatters: 'High open interest means it will be much easier to buy or sell the option at a fair price (high liquidity).'
  },
  'Volume': {
    technical: 'The number of option contracts traded during a given period (usually a single trading day).',
    simple: 'How many times this exact option changed hands today.',
    whyItMatters: 'High volume indicates high current interest, making it easier to execute trades quickly.'
  },
  'Break-Even': {
    technical: 'The price the underlying asset must reach at expiration for the option buyer to recover their premium paid (Call: Strike + Premium, Put: Strike - Premium).',
    simple: 'The exact stock price at expiration where you don\'t lose money, but you don\'t make money either.',
    whyItMatters: 'It helps you understand exactly how far the stock needs to move before your trade is truly profitable at expiration.'
  },
  'Time Decay': {
    technical: 'The reduction in the extrinsic value of an options contract as it gets closer to its expiration date (measured by Theta).',
    simple: 'The slow bleed of value every day just because time is passing.',
    whyItMatters: 'If the stock price doesn\'t move fast enough, time decay will eat away your option\'s value.'
  },
  'Days to Expiration': {
    technical: 'The number of calendar days remaining until the options contract expires.',
    simple: 'How much time you have left for your bet to play out.',
    whyItMatters: 'The less time you have, the faster the option loses value (time decay), and the less time the stock has to move in your favor.'
  },
  'Long Call': {
    technical: 'Buying a call option gives you the right to purchase the underlying asset at the strike price before expiration.',
    simple: 'You pay a premium to lock in a buy price for the stock. If the stock goes up past your strike + premium, you profit.',
    whyItMatters: 'It offers theoretically unlimited upside with defined risk (you can only lose what you paid for the option).'
  },
  'Long Put': {
    technical: 'Buying a put option gives you the right to sell the underlying asset at the strike price before expiration.',
    simple: 'You pay a premium to lock in a sell price for the stock. If the stock drops below your strike minus premium, you profit.',
    whyItMatters: 'It is a defined-risk way to profit from a stock falling, or to protect stock you already own from a crash.'
  },
  'Covered Call': {
    technical: 'Holding a long position in an asset and selling (writing) a call option on that same asset to generate income.',
    simple: 'You own 100 shares of a stock and sell someone else the right to buy them from you at a higher price, keeping the premium they pay you.',
    whyItMatters: 'It generates income in a flat or slightly bullish market, but caps your maximum upside if the stock skyrockets.'
  },
  'Cash-Secured Put': {
    technical: 'Writing a put option and simultaneously setting aside the cash required to buy the stock if assigned.',
    simple: 'You agree to buy a stock at a discount if it falls, and you get paid a premium right now for making that promise.',
    whyItMatters: 'A popular strategy to get paid while waiting to buy a stock you want anyway, but you risk catching a falling knife if the stock crashes.'
  },
  'Bull Call Spread': {
    technical: 'A debit spread involving the purchase of a call option and the sale of a call option at a higher strike price with the same expiration.',
    simple: 'You buy a call to bet the stock goes up, and sell a higher call to make the trade cheaper. Your profit is capped at the higher strike.',
    whyItMatters: 'Reduces the cost and time decay of buying a straight call, but limits your maximum potential profit.'
  },
  'Bear Put Spread': {
    technical: 'A debit spread involving the purchase of a put option and the sale of a put option at a lower strike price with the same expiration.',
    simple: 'You buy a put to bet the stock goes down, and sell a lower put to make the trade cheaper. Your profit is capped at the lower strike.',
    whyItMatters: 'Reduces the cost of shorting a stock or buying a naked put, while strictly defining your risk and reward.'
  },
  'Bull Put Spread': {
    technical: 'A credit spread involving the sale of a put option and the purchase of a put option at a lower strike price to cap risk.',
    simple: 'You get paid to bet a stock will stay above a certain price. You buy a cheaper, lower put just in case the stock crashes.',
    whyItMatters: 'Generates income with defined risk. You want the stock to stay flat or go up so both options expire worthless and you keep the credit.'
  },
  'Bear Call Spread': {
    technical: 'A credit spread involving the sale of a call option and the purchase of a call option at a higher strike price to cap risk.',
    simple: 'You get paid to bet a stock will stay below a certain price. You buy a cheaper, higher call just in case the stock spikes.',
    whyItMatters: 'Generates income with defined risk. You want the stock to stay flat or go down so both options expire worthless and you keep the credit.'
  }
};
