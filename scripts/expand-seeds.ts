import { YouTubeScraper } from '../src/scrapers/youtube';
import { PatreonScraper } from '../src/scrapers/patreon';
import { SubstackScraper } from '../src/scrapers/substack';
import * as fs from 'fs';

/**
 * This script helps expand seed profiles by searching for food creators
 * across all platforms. Run this periodically to keep seeds fresh.
 */

async function expandSeeds() {
  console.log('🌱 Seed Expansion Tool\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const newSeeds = {
    youtube: new Set<string>(),
    patreon: new Set<string>(),
    substack: new Set<string>(),
  };

  // Food-related keywords to search
  const foodKeywords = [
    'cooking recipe',
    'baking recipes',
    'food vlog',
    'meal prep',
    'home cooking',
    'chef cooking',
    'easy recipes',
    'healthy cooking',
    'vegan recipes',
    'dessert recipes',
    'food tutorial',
    'cooking channel',
    'recipe video',
    'food blog',
    'culinary arts',
  ];

  // === YOUTUBE SEED EXPANSION ===
  console.log('📺 Expanding YouTube Seeds...\n');
  const youtubeScraper = new YouTubeScraper();

  for (const keyword of foodKeywords) {
    console.log(`   Searching: "${keyword}"`);
    try {
      const channels = await youtubeScraper.searchChannels(keyword, 20);
      channels.forEach(id => newSeeds.youtube.add(id));
      console.log(`      ✓ Found ${channels.length} channels`);
    } catch (error: any) {
      console.log(`      ✗ Error: ${error.message}`);
    }
  }

  console.log(`\n   Total unique YouTube channels: ${newSeeds.youtube.size}`);

  // === PATREON SEED EXPANSION ===
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💰 Expanding Patreon Seeds...\n');
  const patreonScraper = new PatreonScraper();

  const patreonKeywords = ['recipe', 'cooking', 'food', 'chef', 'baking'];

  for (const keyword of patreonKeywords) {
    console.log(`   Searching Google for: "${keyword} patreon"`);
    try {
      const creators = await patreonScraper.searchGoogleForPatreon(keyword, 50);
      creators.forEach(url => newSeeds.patreon.add(url));
      console.log(`      ✓ Found ${creators.length} creators`);
    } catch (error: any) {
      console.log(`      ✗ Error: ${error.message}`);
    }
  }

  console.log(`\n   Total unique Patreon creators: ${newSeeds.patreon.size}`);

  // === SUBSTACK SEED EXPANSION ===
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📝 Expanding Substack Seeds...\n');
  const substackScraper = new SubstackScraper();

  const substackKeywords = ['recipe', 'cooking', 'food', 'chef', 'baking', 'culinary'];

  for (const keyword of substackKeywords) {
    console.log(`   Searching Google for: "${keyword} substack"`);
    try {
      const pubs = await substackScraper.searchGoogleForSubstacks(keyword, 50);
      pubs.forEach(url => newSeeds.substack.add(url));
      console.log(`      ✓ Found ${pubs.length} publications`);
    } catch (error: any) {
      console.log(`      ✗ Error: ${error.message}`);
    }
  }

  console.log(`\n   Total unique Substack publications: ${newSeeds.substack.size}`);

  // === GENERATE SEED FILE CODE ===
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📝 Generating seed code...\n');

  let seedCode = '// === EXPANDED YOUTUBE SEEDS (ADD THESE TO seeds.ts) ===\n\n';
  seedCode += 'export const EXPANDED_YOUTUBE = [\n';
  Array.from(newSeeds.youtube).forEach(id => {
    seedCode += `  '${id}',\n`;
  });
  seedCode += '];\n\n';

  seedCode += '// === EXPANDED PATREON SEEDS (ADD THESE TO seeds.ts) ===\n\n';
  seedCode += 'export const EXPANDED_PATREON = [\n';
  Array.from(newSeeds.patreon).forEach(url => {
    seedCode += `  '${url}',\n`;
  });
  seedCode += '];\n\n';

  seedCode += '// === EXPANDED SUBSTACK SEEDS (ADD THESE TO seeds.ts) ===\n\n';
  seedCode += 'export const EXPANDED_SUBSTACK = [\n';
  Array.from(newSeeds.substack).forEach(url => {
    seedCode += `  '${url}',\n`;
  });
  seedCode += '];\n';

  // Save to file
  const outputPath = './data/expanded-seeds.ts';
  fs.writeFileSync(outputPath, seedCode);

  console.log('✅ Seed expansion complete!\n');
  console.log('Summary:');
  console.log(`   YouTube: ${newSeeds.youtube.size} channels`);
  console.log(`   Patreon: ${newSeeds.patreon.size} creators`);
  console.log(`   Substack: ${newSeeds.substack.size} publications`);
  console.log(`\nOutput saved to: ${outputPath}`);
  console.log('\nNext steps:');
  console.log('1. Review the generated seeds in data/expanded-seeds.ts');
  console.log('2. Copy the seeds you want to src/data/seeds.ts');
  console.log('3. Run discovery again with the expanded seed list\n');
}

expandSeeds().catch(console.error);
