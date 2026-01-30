/**
 * Test if OpenAI embeddings are consistent for the same input
 */
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testConsistency() {
  const text = "imposter syndrome";

  console.log(`Testing embedding consistency for: "${text}"\n`);

  // Generate 3 embeddings for the same text
  const embeddings = [];
  for (let i = 0; i < 3; i++) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    embeddings.push(response.data[0].embedding);
    console.log(`Embedding ${i + 1}: First 5 values: [${response.data[0].embedding.slice(0, 5).map(v => v.toFixed(8)).join(', ')}]`);
  }

  // Compare them
  console.log('\nComparing embeddings:');
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      let identical = true;
      for (let k = 0; k < 1536; k++) {
        if (embeddings[i][k] !== embeddings[j][k]) {
          identical = false;
          break;
        }
      }
      console.log(`  Embedding ${i + 1} vs ${j + 1}: ${identical ? 'IDENTICAL' : 'DIFFERENT'}`);

      if (!identical) {
        // Calculate cosine similarity
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let k = 0; k < 1536; k++) {
          dotProduct += embeddings[i][k] * embeddings[j][k];
          normA += embeddings[i][k] * embeddings[i][k];
          normB += embeddings[j][k] * embeddings[j][k];
        }
        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        console.log(`    Cosine similarity: ${similarity.toFixed(10)}`);
      }
    }
  }
}

testConsistency().catch(console.error);
