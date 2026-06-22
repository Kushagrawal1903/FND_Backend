import dns from 'dns';
import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import FactCheck from './src/models/factCheck.model.js';
import { VERDICTS } from './src/config/constants.js';

// Apply custom DNS resolvers (same as server.js) for MongoDB Atlas SRV lookup
dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']);


/**
 * 8 realistic sample FactCheck records covering all verdict types
 * and a variety of popular fake-news topics.
 */
const sampleNews = [
  // ─────────────────────────────────────────────
  // 1. FALSE — COVID Vaccine Microchip Myth
  // ─────────────────────────────────────────────
  {
    userId: null,
    claim: 'COVID-19 vaccines contain microchips that allow governments to track and monitor the population.',
    verdict: VERDICTS.FALSE,
    confidence: 98,
    explanation:
      'This claim is VERIFIED AS FALSE with 98% confidence. Independent fact-checkers from PolitiFact, FactCheck.org, and Snopes have investigated this statement and concluded it is false, fabricated, or severely taken out of context. The COVID-19 vaccines contain mRNA or viral vector components — not any electronic device or microchip. Sharing this information without correction is misleading. Please consult the referenced sources for detailed refutations.',
    sources: [
      {
        publisher: 'PolitiFact',
        url: 'https://www.politifact.com/factchecks/2021/jan/08/facebook-posts/no-covid-19-vaccine-doesnt-have-microchip/',
        verdict: 'False',
      },
      {
        publisher: 'FactCheck.org',
        url: 'https://www.factcheck.org/2020/nov/the-covid-19-vaccine-wont-include-a-microchip/',
        verdict: 'False',
      },
      {
        publisher: 'Snopes',
        url: 'https://www.snopes.com/fact-check/covid-19-vaccine-microchip/',
        verdict: 'False',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 2. FALSE — 5G Towers Spread COVID-19
  // ─────────────────────────────────────────────
  {
    userId: null,
    claim: '5G towers and electromagnetic radiation are responsible for causing and spreading the COVID-19 virus.',
    verdict: VERDICTS.FALSE,
    confidence: 97,
    explanation:
      'This claim is VERIFIED AS FALSE with 97% confidence. Viruses cannot travel on radio waves or mobile networks. COVID-19 is spreading in many countries that do not have 5G mobile networks. Fact-checkers from Full Fact, WHO, and Reuters have thoroughly debunked this conspiracy theory. 5G is a radio-wave technology and has no interaction with biological organisms at the levels used in telecommunications.',
    sources: [
      {
        publisher: 'Full Fact',
        url: 'https://fullfact.org/online/5g-and-coronavirus/',
        verdict: 'False',
      },
      {
        publisher: 'Reuters Fact Check',
        url: 'https://www.reuters.com/article/uk-factcheck-5g/',
        verdict: 'False',
      },
      {
        publisher: 'WHO',
        url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public/myth-busters',
        verdict: 'Incorrect',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 3. FALSE — Earth is Flat
  // ─────────────────────────────────────────────
  {
    userId: null,
    claim: 'The Earth is flat and NASA has been hiding this from the public for decades using doctored satellite images.',
    verdict: VERDICTS.FALSE,
    confidence: 99,
    explanation:
      'This claim is VERIFIED AS FALSE with 99% confidence. The Earth is an oblate spheroid — a well-established scientific fact confirmed through centuries of physics, astronomy, satellite imagery, and independent observation by space agencies worldwide including NASA, ESA, ISRO, and JAXA. No credible evidence supports the flat Earth hypothesis. Snopes and multiple scientific institutions have repeatedly debunked this claim.',
    sources: [
      {
        publisher: 'Snopes',
        url: 'https://www.snopes.com/fact-check/flat-earth/',
        verdict: 'False',
      },
      {
        publisher: 'NASA',
        url: 'https://www.nasa.gov/audience/forstudents/5-8/features/nasa-knows/what-is-earth-58.html',
        verdict: 'Incorrect',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 4. TRUE — Climate Change is Human-Caused
  // ─────────────────────────────────────────────
  {
    userId: null,
    claim: 'Human activities, particularly the burning of fossil fuels, are the primary driver of climate change and global warming since the mid-20th century.',
    verdict: VERDICTS.TRUE,
    confidence: 97,
    explanation:
      'This claim is VERIFIED AS TRUE with 97% confidence. Our analysis matched the claim against records from trusted fact-checking organizations including Climate Feedback and Snopes. A scientific consensus of over 97% of actively publishing climate scientists agrees that human-caused climate change is occurring. The IPCC Sixth Assessment Report (2021) concluded with "unequivocal" certainty that human influence has warmed the atmosphere, ocean, and land.',
    sources: [
      {
        publisher: 'Climate Feedback',
        url: 'https://climatefeedback.org/evaluation/human-caused-climate-change/',
        verdict: 'Accurate',
      },
      {
        publisher: 'Snopes',
        url: 'https://www.snopes.com/fact-check/climate-change-consensus/',
        verdict: 'True',
      },
      {
        publisher: 'NASA Climate',
        url: 'https://climate.nasa.gov/causes/',
        verdict: 'Correct',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 5. MIXTURE — Bill Gates Controls WHO
  // ─────────────────────────────────────────────
  {
    userId: null,
    claim: 'Bill Gates controls the World Health Organization and uses it to push mandatory global vaccine programs for profit.',
    verdict: VERDICTS.MIXTURE,
    confidence: 78,
    explanation:
      'This claim is a MIXTURE of true and false statements, rated with 78% confidence. Reports from PolitiFact and AFP Fact Check indicate that while some aspects of the claim are true — the Bill & Melinda Gates Foundation is one of the largest donors to the WHO — other parts are incorrect or exaggerated. Gates does not "control" WHO; it is governed by its 194 member states. The claim of profit-driven motives is not supported by evidence. We recommend reviewing the sources closely to understand which specific assertions are supported and which are inaccurate.',
    sources: [
      {
        publisher: 'PolitiFact',
        url: 'https://www.politifact.com/factchecks/2020/apr/27/facebook-posts/bill-gates-who-vaccines/',
        verdict: 'Mostly False',
      },
      {
        publisher: 'AFP Fact Check',
        url: 'https://factcheck.afp.com/no-bill-gates-does-not-control-world-health-organization',
        verdict: 'False',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 6. FALSE — Drinking Bleach Cures COVID-19
  // ─────────────────────────────────────────────
  {
    userId: null,
    claim: 'Drinking bleach or disinfectant solutions can cure COVID-19 by killing the virus inside the human body.',
    verdict: VERDICTS.FALSE,
    confidence: 99,
    explanation:
      'This claim is VERIFIED AS FALSE with 99% confidence and is extremely dangerous. Ingesting bleach or household disinfectants is life-threatening and can cause severe chemical burns to the throat, stomach, and internal organs. WHO, CDC, and every credible medical body have explicitly warned against this practice. There is absolutely no scientific evidence that consuming disinfectants treats or cures COVID-19 or any other viral infection.',
    sources: [
      {
        publisher: 'CDC',
        url: 'https://www.cdc.gov/coronavirus/2019-ncov/prevent-getting-sick/prevention.html',
        verdict: 'False',
      },
      {
        publisher: 'WHO',
        url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public/myth-busters',
        verdict: 'Incorrect',
      },
      {
        publisher: 'Snopes',
        url: 'https://www.snopes.com/fact-check/injecting-disinfectant-coronavirus/',
        verdict: 'False',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 7. MIXTURE — Social Media Censors Conservative Content
  // ─────────────────────────────────────────────
  {
    userId: null,
    claim: 'Major social media platforms like Facebook and Twitter systematically and deliberately censor conservative political content and viewpoints.',
    verdict: VERDICTS.MIXTURE,
    confidence: 62,
    explanation:
      'This claim is a MIXTURE of true and false statements, rated with 62% confidence. While some conservative content has been removed or flagged on social media platforms, independent audits and internal platform reports show that content moderation policies are generally applied across the political spectrum. PolitiFact and Reuters investigations found no evidence of systematic bias, though isolated incidents and algorithmic inconsistencies have been documented. The issue is complex and context-dependent.',
    sources: [
      {
        publisher: 'PolitiFact',
        url: 'https://www.politifact.com/factchecks/2020/aug/social-media-conservative-bias/',
        verdict: 'Half True',
      },
      {
        publisher: 'Reuters Fact Check',
        url: 'https://www.reuters.com/article/factcheck-social-media-bias/',
        verdict: 'Partly False',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 8. UNVERIFIED — Ancient Pyramids Built by Aliens
  // ─────────────────────────────────────────────
  {
    userId: null,
    claim: 'The ancient Egyptian pyramids at Giza were built by extraterrestrial beings with advanced technology, not by human workers.',
    verdict: VERDICTS.UNVERIFIED,
    confidence: 0,
    explanation:
      'This claim is currently UNVERIFIED. We did not find any official fact-check reports addressing this statement in our verified database. However, extensive archaeological evidence — including workers\' villages, administrative records, tools, and graffiti left by work gangs — conclusively demonstrates that the pyramids were built by organised teams of Egyptian workers. No credible peer-reviewed evidence supports extraterrestrial involvement. Please check for additional scientific context or source documentation before sharing.',
    sources: [],
  },
];

const seedNews = async () => {
  try {
    console.log('Connecting to database for news seeding...');
    await connectDB();

    // Remove existing sample fact-check records (those without a userId)
    const deletedCount = await FactCheck.deleteMany({ userId: null });
    console.log(`Cleared ${deletedCount.deletedCount} existing anonymous fact-check records.`);

    // Insert all sample records
    const inserted = await FactCheck.insertMany(sampleNews);
    console.log(`\n✅  Successfully seeded ${inserted.length} sample news fact-check records!\n`);

    // Display a summary
    inserted.forEach((record, i) => {
      console.log(
        `  ${i + 1}. [${record.verdict.toUpperCase().padEnd(10)}] ${record.claim.substring(0, 70)}...`
      );
    });

    console.log('\nDisconnecting from database...');
    await mongoose.disconnect();
    console.log('Done. News seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding news records:', error.message);
    process.exit(1);
  }
};

seedNews();
