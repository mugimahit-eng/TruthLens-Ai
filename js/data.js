/* ==========================================================================
   TruthLens AI — Static data: samples, curated fact-checks, trusted sources
   ========================================================================== */
(function () {
  'use strict';
  var TL = (window.TL = window.TL || {});

  TL.samples = {
    newsFake: {
      title: 'SHOCKING!!! Hot lemon water CURES cancer overnight — doctors are hiding it',
      text: "SHOCKING!!! Scientists EXPOSED: drinking hot lemon water every morning cures cancer overnight, and Big Pharma doesn't want you to know! " +
        "Sources say thousands of patients were completely cured in just 3 days but the mainstream media is hiding the truth. " +
        "Doctors hate this one weird trick. This is 100% guaranteed and nobody is talking about it. Wake up people!!! " +
        "Share this with everyone before it's deleted!!!",
      url: 'http://real-truth-news24.xyz/shocking-miracle-cure-exposed'
    },
    newsReal: {
      title: 'City council approves budget with 12% increase for public transport',
      text: "The city council approved a revised annual budget on Tuesday that allocates 12 percent more funding to public transport, according to a statement released by the mayor's office. " +
        "The plan, which passed by a vote of 9 to 3, includes the purchase of 40 electric buses over the next two years. " +
        "\"This investment will reduce emissions and improve daily commutes for thousands of residents,\" a council spokesperson told reporters. " +
        "Opposition members said the proposal did not address road maintenance costs, which a 2023 municipal audit estimated at 8.5 million dollars. " +
        "The budget will take effect from April 1, officials said.",
      url: 'https://www.reuters.com/world/'
    },
    reviewFake: {
      product: 'UltraBoost Pro Wireless Earbuds',
      category: 'Electronics',
      rating: 5,
      verified: false,
      text: "Amazing amazing product!!! Best product ever, I love it so much. I bought it and my life changed. I highly recommend this to everyone. " +
        "UltraBoost Pro Wireless Earbuds are perfect perfect perfect. Must buy!!! Five stars. UltraBoost Pro Wireless Earbuds is the best. " +
        "Visit our official store and use code SAVE20 for discount!!!"
    },
    reviewReal: {
      product: 'SoundWave 300 Headphones',
      category: 'Electronics',
      rating: 4,
      verified: true,
      text: "I've been using these headphones for about three weeks, mainly on my commute. The noise cancellation is solid on the train, though it struggles a bit with wind. " +
        "Battery lasts around 25 hours for me, a little under the advertised 30. The ear cushions get warm after an hour or so. " +
        "For the price I'm happy with them, but the app is clunky and pairing with my laptop took a couple of tries."
    }
  };

  /* Curated, well-documented claims with their established verdicts.
     Source links point to the publishing organisation's site. */
  TL.facts = [
    { claim: '5G mobile networks spread COVID-19.', verdict: 'False', category: 'Health',
      detail: 'Viruses cannot travel on radio waves or mobile networks. COVID-19 also spread widely in countries with no 5G coverage.',
      source: 'World Health Organization', url: 'https://www.who.int/' },
    { claim: 'Washing hands with soap for at least 20 seconds helps prevent the spread of germs.', verdict: 'True', category: 'Health',
      detail: 'Public-health agencies recommend handwashing with soap as one of the most effective ways to remove germs and prevent infections.',
      source: 'CDC', url: 'https://www.cdc.gov/' },
    { claim: 'Vaccines cause autism.', verdict: 'False', category: 'Health',
      detail: 'Large studies covering millions of children found no link. The 1998 paper that started the claim was retracted and its author lost his medical licence.',
      source: 'World Health Organization', url: 'https://www.who.int/' },
    { claim: 'Antibiotics can cure viral infections like the common cold or flu.', verdict: 'False', category: 'Health',
      detail: 'Antibiotics act on bacteria, not viruses. Misusing them for colds or flu contributes to antibiotic resistance.',
      source: 'World Health Organization', url: 'https://www.who.int/' },
    { claim: 'Eating carrots gives you exceptional night vision.', verdict: 'Misleading', category: 'Health',
      detail: 'Vitamin A supports normal eye health, but extra carrots will not give better-than-normal night vision. The idea was spread as WWII propaganda.',
      source: 'Smithsonian Magazine', url: 'https://www.smithsonianmag.com/' },
    { claim: '"Natural" remedies are always safe to take.', verdict: 'Misleading', category: 'Health',
      detail: 'Many natural substances can be harmful in large doses or interact with prescription medicines. Natural does not automatically mean safe.',
      source: 'World Health Organization', url: 'https://www.who.int/' },
    { claim: 'Earth\'s recent warming is mainly caused by human activities.', verdict: 'True', category: 'Climate',
      detail: 'The scientific assessment is that human influence, mainly from burning fossil fuels, has unequivocally warmed the atmosphere, ocean and land.',
      source: 'IPCC', url: 'https://www.ipcc.ch/' },
    { claim: 'The Great Wall of China is visible from space with the naked eye.', verdict: 'False', category: 'Science',
      detail: 'Astronauts report the wall is extremely hard or impossible to see unaided from orbit. It is long but narrow and similar in colour to the land around it.',
      source: 'NASA', url: 'https://www.nasa.gov/' },
    { claim: 'Humans only use 10% of their brains.', verdict: 'False', category: 'Science',
      detail: 'Brain scans show activity across virtually every region, and even simple tasks engage many areas at once.',
      source: 'Scientific American', url: 'https://www.scientificamerican.com/' },
    { claim: 'Lightning never strikes the same place twice.', verdict: 'False', category: 'Science',
      detail: 'Tall structures are struck repeatedly. The Empire State Building is hit roughly 20–25 times per year.',
      source: 'US National Weather Service', url: 'https://www.weather.gov/' },
    { claim: 'Microwaving food makes it radioactive.', verdict: 'False', category: 'Technology',
      detail: 'Microwave ovens heat food by making water molecules vibrate. They do not make food radioactive.',
      source: 'US FDA', url: 'https://www.fda.gov/' },
    { claim: 'Mount Everest is the highest mountain above sea level.', verdict: 'True', category: 'Science',
      detail: 'At about 8,849 m, Everest has the highest summit elevation above sea level on Earth.',
      source: 'Encyclopaedia Britannica', url: 'https://www.britannica.com/' }
  ];

  TL.sources = [
    { name: 'Reuters Fact Check', short: 'R', desc: 'Global news agency fact-checking viral claims and images.', url: 'https://www.reuters.com/fact-check/' },
    { name: 'AP Fact Check', short: 'AP', desc: 'Associated Press verification of political and viral claims.', url: 'https://apnews.com/ap-fact-check' },
    { name: 'PolitiFact', short: 'PF', desc: 'Rates claims on the Truth-O-Meter from True to Pants on Fire.', url: 'https://www.politifact.com/' },
    { name: 'Snopes', short: 'S', desc: 'One of the oldest fact-checking sites for rumours and urban legends.', url: 'https://www.snopes.com/' },
    { name: 'FactCheck.org', short: 'FC', desc: 'Non-partisan project of the Annenberg Public Policy Center.', url: 'https://www.factcheck.org/' },
    { name: 'Full Fact', short: 'FF', desc: 'UK-based independent fact-checking charity.', url: 'https://fullfact.org/' },
    { name: 'Alt News', short: 'AN', desc: 'Indian fact-checking site debunking misinformation and doctored media.', url: 'https://www.altnews.in/' },
    { name: 'BOOM', short: 'B', desc: 'IFCN-certified Indian fact-checking initiative.', url: 'https://www.boomlive.in/' },
    { name: 'PIB Fact Check', short: 'PIB', desc: 'Government of India unit that checks claims about government policies.', url: 'https://pib.gov.in/' }
  ];
})();
