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
  | 'Bear Call Spread'
  | 'Realized Volatility'
  | 'IV Rank'
  | 'IV Percentile'
  | 'Volatility Skew'
  | 'Term Structure'
  | 'Net Edge'
  | 'Liquidity Score'
  | 'Data Quality'
  | 'Execution Score'
  | 'Quality Score'
  | 'Market Regime'
  | 'Arbitrage'
  | 'No-Arbitrage Relationship'
  | 'Put-Call Parity'
  | 'Synthetic Stock'
  | 'Conversion'
  | 'Reversal'
  | 'Box Spread'
  | 'Vertical Spread Bounds'
  | 'Slippage'
  | 'Financing'
  | 'Borrow Cost'
  | 'Expected Move'
  | 'Expected Range'
  | 'Probability ITM'
  | 'Probability OTM'
  | 'Probability of Profit'
  | 'Probability Density'
  | 'Strategy Screening'
  | 'Market View'
  | 'Capital Efficiency'
  | 'Thesis Consistency'
  | 'Execution Risk';

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
  },
  'Expected Move': {
    technical: 'The magnitude of price movement implied by the options market, commonly derived from the straddle price or standard deviation formula.',
    simple: 'How much the options market expects the stock to move (up or down) by a certain date. It is derived from option prices, not from fundamental analysis.',
    whyItMatters: 'If you think the stock will move more than the Expected Move, buying options might be a good idea. If you think it will move less, selling options might be better. It sets the market baseline.'
  },
  'Expected Range': {
    technical: 'The upper and lower bounds calculated by adding and subtracting the Expected Move from the current underlying price.',
    simple: 'The price range where the market expects the stock to end up most of the time by expiration.',
    whyItMatters: 'Options sold outside the expected range are often considered higher probability, though they collect less premium.'
  },
  'Probability ITM': {
    technical: 'The theoretical risk-neutral probability that an option will expire In-The-Money, often approximated using N(d2) from the Black-Scholes model.',
    simple: 'The model\'s estimate of the chance the option will have some value at expiration.',
    whyItMatters: 'A 30 delta call has roughly a 30% chance of expiring ITM. Note that expiring ITM does NOT guarantee the trade makes a profit.'
  },
  'Probability OTM': {
    technical: 'The theoretical risk-neutral probability that an option will expire Out-of-The-Money, often calculated as 1 minus the Probability ITM.',
    simple: 'The mathematical chance that the option expires completely worthless.',
    whyItMatters: 'For option sellers, this represents the theoretical win rate if they hold the option to expiration. For buyers, it represents the chance of total loss.'
  },
  'Probability of Profit': {
    technical: 'The theoretical risk-neutral probability that the underlying asset price will settle beyond the strategy\'s break-even point at expiration.',
    simple: 'The model\'s estimate of the chance you will make at least $0.01 on this trade at expiration.',
    whyItMatters: 'Probability of Profit (POP) is often different from Probability ITM. A long call can expire ITM but still lose money if the stock didn\'t move past the break-even price.'
  },
  'Probability Density': {
    technical: 'A continuous probability distribution representing the likelihood of the underlying asset finishing at specific price points at expiration.',
    simple: 'A visual curve showing where the stock is most likely to end up. The peak is the current price, and the tails show extreme moves.',
    whyItMatters: 'Helps visualize market expectations. A wider, flatter curve means the market expects high volatility and large price swings.'
  },
  'Realized Volatility': {
    technical: 'The actual historical standard deviation of an asset\'s returns over a specific period, annualized.',
    simple: 'How much the stock price actually moved in the past. Compare this to implied volatility to see if options are pricing in more or less movement than historically occurred.',
    whyItMatters: 'If implied volatility is much higher than realized volatility, options may be overpriced. If lower, they may be cheap. This comparison is one input into volatility trading strategies.'
  },
  'IV Rank': {
    technical: 'Current IV relative to its historical range: (Current IV - 52-week Low IV) / (52-week High IV - 52-week Low IV) × 100.',
    simple: 'Where is today\'s implied volatility compared to its highest and lowest points? An IV Rank of 80 means current IV is near its historical high.',
    whyItMatters: 'High IV Rank may suggest options are relatively expensive compared to recent history. Low IV Rank may suggest they are cheap. This is context, not a trading signal.'
  },
  'IV Percentile': {
    technical: 'The percentage of trading days in the lookback period where IV was at or below the current level.',
    simple: 'What percentage of days had lower volatility than today? An IV Percentile of 90 means today\'s IV is higher than 90% of recent days.',
    whyItMatters: 'Unlike IV Rank which only uses the min and max, IV Percentile uses all data points. It shows how unusual today\'s IV level is relative to the full distribution.'
  },
  'Volatility Skew': {
    technical: 'The difference in implied volatility across strike prices for the same expiration date.',
    simple: 'Options at different prices don\'t all have the same implied volatility. Usually out-of-the-money puts have higher IV than calls, reflecting greater demand for downside protection.',
    whyItMatters: 'The shape of the volatility skew reveals market sentiment about tail risks. A steep put skew indicates the market is pricing in more crash risk.'
  },
  'Term Structure': {
    technical: 'The pattern of at-the-money implied volatility across different expiration dates.',
    simple: 'Comparing IV across near-term and far-term options. Usually longer-dated options have higher IV (contango). When near-term IV is higher (backwardation), it often signals a near-term event like earnings.',
    whyItMatters: 'Term structure tells you whether the market expects more volatility in the near future or the distant future. Shifts can signal event-driven uncertainty.'
  },
  'Strategy Screening': {
    technical: 'The systematic filtration of option combinations using bounded constraints based on user-defined inputs, liquidity constraints, and margin requirements.',
    simple: 'Searching through thousands of possible option trades to find the ones that actually fit what you want to do.',
    whyItMatters: 'It prevents you from picking a random trade that doesn\'t match your account size or your view of where the stock is going.'
  },
  'Market View': {
    technical: 'A parameterized directional and volatility forecast that dictates which option structures possess an appropriate Greek exposure.',
    simple: 'Your opinion on what the stock and its volatility will do over a certain timeframe.',
    whyItMatters: 'If your market view is wrong, the best options trade in the world will still lose money. Options magnify your market view.'
  },
  'Capital Efficiency': {
    technical: 'The ratio of theoretical maximum profit to the initial margin requirement or capital outlay of the strategy.',
    simple: 'How much bang you are getting for your buck. If you have to risk $10,000 to make $10, it has terrible capital efficiency.',
    whyItMatters: 'Allows you to compare strategies with different margin requirements to see which is the best use of your account balance.'
  },
  'Thesis Consistency': {
    technical: 'The analytical verification that a selected strategy\'s payoff profile (Delta/Vega/Theta) aligns with the explicitly stated market view.',
    simple: 'Making sure the trade you picked actually makes money if your prediction comes true.',
    whyItMatters: 'Many beginners buy options thinking a stock will go up, but they buy the wrong strike or expiration, so even if the stock goes up, they lose money. Thesis consistency checks for that mismatch.'
  },
  'Net Edge': {
    technical: 'The modeled gross profit minus estimated transaction costs (commissions, exchange fees, regulatory fees, slippage).',
    simple: 'How much theoretical profit remains after accounting for the cost of executing the trade. If this number is zero or negative, the opportunity may not be worth pursuing.',
    whyItMatters: 'Gross edge can look attractive, but transaction costs can consume a large fraction of small opportunities. Net edge shows the realistic potential.'
  },
  'Liquidity Score': {
    technical: 'A weighted composite of bid/ask spread percentage (40%), average volume (30%), and open interest (30%), normalized to 0–100.',
    simple: 'A score measuring how easily you can enter and exit a position at a fair price. Higher scores mean tighter markets and more trading activity.',
    whyItMatters: 'Low liquidity means wider spreads, more slippage, and difficulty exiting. An opportunity with a great theoretical edge but low liquidity may be impractical to execute.'
  },
  'Data Quality': {
    technical: 'A score measuring the completeness and consistency of the market data powering the analysis: field presence (50%), pricing consistency (25%), data availability (25%).',
    simple: 'How complete and reliable is the information being used to analyze this opportunity? Missing Greeks, zero volume, or inconsistent bid/ask prices lower this score.',
    whyItMatters: 'Analysis is only as good as its inputs. A low data quality score means the analysis may be unreliable. Always check what data is missing before acting.'
  },
  'Execution Score': {
    technical: 'A deductive score starting at 100, with deductions for missing quotes (-30), wide spreads (-20), low volume (-20), low open interest (-15), and missing cost info (-15).',
    simple: 'Can this trade actually be executed at or near the displayed prices? The score drops for each practical barrier to execution.',
    whyItMatters: 'A theoretically perfect trade is useless if you cannot execute it. This score flags the most common reasons a trade might not fill as expected.'
  },
  'Quality Score': {
    technical: 'A configurable weighted composite: Edge (30%) + Execution (25%) + Liquidity (20%) + Data Quality (15%) + Cost Certainty (10%). All components are normalized to 0–100.',
    simple: 'A single number that combines everything: Is there an edge? Can you execute it? Is there enough liquidity? Is the data reliable? Are costs predictable?',
    whyItMatters: 'This score ranks opportunities for investigation, not for trading. A high score means the opportunity is worth analyzing further, not that it should be executed.'
  },
  'Market Regime': {
    technical: 'A classification of the current market environment based on trend direction (price change) and volatility level (ATM implied volatility).',
    simple: 'Is the market going up, going down, or staying flat? Is volatility high, low, or moderate? This gives you a quick read of current conditions.',
    whyItMatters: 'Different strategies work better in different regimes. Understanding the current environment helps you evaluate whether a strategy is appropriate.'
  },
  'Arbitrage': {
    technical: 'The simultaneous purchase and sale of related instruments to exploit a pricing discrepancy between them. In efficient markets, true arbitrage is rare and self-correcting.',
    simple: 'Finding a price mismatch between related assets and trading both sides to profit from the difference.',
    whyItMatters: 'Understanding arbitrage helps you recognize whether a perceived opportunity is real or just an artifact of stale quotes, wide bid/ask spreads, or model assumptions.'
  },
  'No-Arbitrage Relationship': {
    technical: 'A mathematical constraint that must hold between related securities in a frictionless market. If violated in theory, rational actors would trade to eliminate the discrepancy.',
    simple: 'A pricing rule that says "if A and B are equivalent, they should cost the same." If they don\'t, there\'s a possible opportunity — but real trades have friction that often explains the gap.',
    whyItMatters: 'Textbook violations almost never survive bid/ask spreads plus transaction costs. Understanding these relationships helps you spot when prices are genuinely unusual.'
  },
  'Put-Call Parity': {
    technical: 'The relationship C - P = S - PV(K) - PV(D), where C=call price, P=put price, S=stock price, PV(K)=present value of strike, PV(D)=present value of dividends.',
    simple: 'A call and a put at the same strike should be priced so that a combined position gives the same payoff as just holding the stock. If they\'re not, there\'s a theoretical imbalance.',
    whyItMatters: 'Put-call parity violations in real markets are usually eliminated by bid/ask spreads and transaction costs. Seeing one in your scanner means the midpoint prices appear inconsistent, but the executable prices may show no profit.'
  },
  'Synthetic Stock': {
    technical: 'A position created by buying a call and selling a put at the same strike and expiration. At expiration, it replicates owning 100 shares of the underlying.',
    simple: 'You can mimic owning a stock using options — buy a call and sell a put at the same price and date. If priced correctly, the cost should equal the stock price adjusted for interest and dividends.',
    whyItMatters: 'If the synthetic costs significantly less or more than the stock, it suggests a pricing discrepancy. But short put requires margin and has downside risk identical to owning the stock.'
  },
  'Conversion': {
    technical: 'An arbitrage structure consisting of long stock, long put, and short call at the same strike and expiration. At expiration, the value is exactly the strike price regardless of stock movement.',
    simple: 'You buy the stock, buy a put for downside protection, and sell a call to offset the cost. If you collect more than the financing cost, there\'s theoretical profit.',
    whyItMatters: 'Conversions are used by market makers to lock in pricing discrepancies. For individual traders, the financing cost of holding the stock usually eliminates any apparent edge.'
  },
  'Reversal': {
    technical: 'The opposite of a conversion: short stock, long call, short put at the same strike and expiration. Requires borrowing shares, so borrow cost is critical.',
    simple: 'You short-sell the stock, buy a call, and sell a put. If the income exceeds the cost of borrowing the stock and buying the call, there may be profit.',
    whyItMatters: 'Reversals are primarily executed by market makers or institutions. Stock borrow costs can be very high for hard-to-borrow names, often eliminating the apparent edge entirely.'
  },
  'Box Spread': {
    technical: 'A four-leg options strategy combining a bull call spread and a bear put spread at the same strikes. Pays exactly K2-K1 at expiration regardless of the stock price. The implied rate is a financing rate.',
    simple: 'A box spread is like lending money using options — you pay less today and receive a fixed amount at expiration. The \'profit\' is really just a below-market financing rate, not a guaranteed windfall.',
    whyItMatters: 'Retail traders occasionally see box spreads that appear profitable. In practice, commissions on all four legs, early assignment risk on the short legs, and margin requirements usually eliminate the edge.'
  },
  'Vertical Spread Bounds': {
    technical: 'A debit spread cannot be worth more than its strike width (K2-K1) at expiration. If the market price violates this, it\'s a no-arbitrage violation.',
    simple: 'If you buy a spread with a $5 strike width, you can never make more than $5 per share. If the market is quoting the spread above $5, either the quotes are stale/crossed or there\'s a real discrepancy.',
    whyItMatters: 'These apparent violations are almost always caused by stale or crossed quotes. Verifying with current bid/ask prices usually shows no executable violation.'
  },
  'Slippage': {
    technical: 'The difference between the expected execution price and the actual fill price, caused by market impact, partial fills, or price movement between order submission and fill.',
    simple: 'The cost of actually getting your trade done. In fast markets or illiquid options, you might pay more (or receive less) than the quoted price.',
    whyItMatters: 'Slippage can eliminate an apparent arbitrage edge, especially on multi-leg strategies where each leg may slip slightly in an unfavorable direction.'
  },
  'Financing': {
    technical: 'The opportunity cost or explicit cost of capital used in a position. For long stock positions, this is the cost of borrowing money or forgoing the risk-free rate on tied-up capital.',
    simple: 'Money tied up in a trade could be earning interest elsewhere. That missed interest is a real cost that must be subtracted from any apparent profit.',
    whyItMatters: 'Arbitrage strategies often tie up large amounts of capital. The financing cost over the holding period (especially for far-dated options) can easily exceed the gross edge.'
  },
  'Borrow Cost': {
    technical: 'The cost to borrow shares for a short sale, charged as an annualized percentage of the stock\'s market value by the prime broker. Hard-to-borrow stocks can have very high borrow rates.',
    simple: 'When you short a stock, you have to borrow the shares from someone. They charge a fee for this, which can range from nearly zero to many percent per year for difficult-to-borrow names.',
    whyItMatters: 'Reversals and other short-stock arbitrage strategies require borrowing shares. An unknown borrow cost makes the net edge impossible to determine — which is why it\'s never assumed to be zero.'
  },
  'Execution Risk': {
    technical: 'The risk that a multi-leg strategy cannot be executed simultaneously at the analyzed prices, resulting in partial fills, price movement between legs, or an incomplete hedge.',
    simple: 'Even if the numbers show a profit on paper, you may not be able to buy and sell all legs at exactly those prices at the same time.',
    whyItMatters: 'Arbitrage strategies require executing multiple legs. If any leg doesn\'t fill (or fills at a worse price), the strategy may become unhedged and expose you to market risk rather than the locked-in theoretical profit.'
  }
};
