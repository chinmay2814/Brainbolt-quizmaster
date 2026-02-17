// ============================================
// BrainBolt - Database Seeder
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { db, initializeDatabase, queries } from './db/sqlite';

// Quiz questions organized by difficulty (1-10)
const questions = [
  // Difficulty 1 - Very Easy
  { difficulty: 1, prompt: "What color is the sky on a clear day?", choices: ["Green", "Blue", "Red", "Yellow"], correctIndex: 1, category: "general" },
  { difficulty: 1, prompt: "How many legs does a dog have?", choices: ["2", "4", "6", "8"], correctIndex: 1, category: "general" },
  { difficulty: 1, prompt: "What is 1 + 1?", choices: ["1", "2", "3", "4"], correctIndex: 1, category: "math" },
  
  // Difficulty 2
  { difficulty: 2, prompt: "What is the capital of France?", choices: ["London", "Berlin", "Paris", "Madrid"], correctIndex: 2, category: "geography" },
  { difficulty: 2, prompt: "How many days are in a week?", choices: ["5", "6", "7", "8"], correctIndex: 2, category: "general" },
  { difficulty: 2, prompt: "What is 5 x 3?", choices: ["8", "12", "15", "18"], correctIndex: 2, category: "math" },
  
  // Difficulty 3
  { difficulty: 3, prompt: "What planet is known as the Red Planet?", choices: ["Venus", "Mars", "Jupiter", "Saturn"], correctIndex: 1, category: "science" },
  { difficulty: 3, prompt: "What is the largest ocean on Earth?", choices: ["Atlantic", "Indian", "Arctic", "Pacific"], correctIndex: 3, category: "geography" },
  { difficulty: 3, prompt: "What is 12 x 8?", choices: ["86", "96", "106", "116"], correctIndex: 1, category: "math" },
  
  // Difficulty 4
  { difficulty: 4, prompt: "Who painted the Mona Lisa?", choices: ["Van Gogh", "Da Vinci", "Picasso", "Rembrandt"], correctIndex: 1, category: "art" },
  { difficulty: 4, prompt: "What is the chemical symbol for gold?", choices: ["Go", "Gd", "Au", "Ag"], correctIndex: 2, category: "science" },
  { difficulty: 4, prompt: "What year did World War II end?", choices: ["1943", "1944", "1945", "1946"], correctIndex: 2, category: "history" },
  
  // Difficulty 5
  { difficulty: 5, prompt: "What is the square root of 144?", choices: ["10", "11", "12", "13"], correctIndex: 2, category: "math" },
  { difficulty: 5, prompt: "Which element has atomic number 6?", choices: ["Nitrogen", "Carbon", "Oxygen", "Boron"], correctIndex: 1, category: "science" },
  { difficulty: 5, prompt: "In which year was the first iPhone released?", choices: ["2005", "2006", "2007", "2008"], correctIndex: 2, category: "technology" },
  
  // Difficulty 6
  { difficulty: 6, prompt: "What is the derivative of x²?", choices: ["x", "2x", "x²", "2x²"], correctIndex: 1, category: "math" },
  { difficulty: 6, prompt: "Who wrote '1984'?", choices: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "H.G. Wells"], correctIndex: 1, category: "literature" },
  { difficulty: 6, prompt: "What is the capital of Australia?", choices: ["Sydney", "Melbourne", "Canberra", "Perth"], correctIndex: 2, category: "geography" },
  
  // Difficulty 7
  { difficulty: 7, prompt: "What is the powerhouse of the cell?", choices: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], correctIndex: 2, category: "biology" },
  { difficulty: 7, prompt: "In what year did the Berlin Wall fall?", choices: ["1987", "1988", "1989", "1990"], correctIndex: 2, category: "history" },
  { difficulty: 7, prompt: "What is the Big O complexity of binary search?", choices: ["O(n)", "O(log n)", "O(n²)", "O(1)"], correctIndex: 1, category: "computer science" },
  
  // Difficulty 8
  { difficulty: 8, prompt: "What is the integral of 1/x?", choices: ["x", "ln(x)", "1/x²", "e^x"], correctIndex: 1, category: "math" },
  { difficulty: 8, prompt: "Which protocol operates at the transport layer?", choices: ["HTTP", "IP", "TCP", "Ethernet"], correctIndex: 2, category: "computer science" },
  { difficulty: 8, prompt: "What is Planck's constant approximately equal to?", choices: ["6.63 × 10⁻³⁴ J·s", "3.00 × 10⁸ m/s", "9.81 m/s²", "1.38 × 10⁻²³ J/K"], correctIndex: 0, category: "physics" },
  
  // Difficulty 9
  { difficulty: 9, prompt: "What is the time complexity of Dijkstra's algorithm with a binary heap?", choices: ["O(V²)", "O(E log V)", "O(V + E)", "O(E²)"], correctIndex: 1, category: "computer science" },
  { difficulty: 9, prompt: "In quantum mechanics, what does the Heisenberg Uncertainty Principle state?", choices: ["Energy is conserved", "Position and momentum cannot both be precisely known", "Light is both wave and particle", "Electrons orbit in fixed shells"], correctIndex: 1, category: "physics" },
  { difficulty: 9, prompt: "What is the CAP theorem about?", choices: ["CPU Architecture", "Distributed Systems", "Cryptography", "Compilers"], correctIndex: 1, category: "computer science" },
  
  // Difficulty 10 - Expert
  { difficulty: 10, prompt: "What is the amortized time complexity of inserting into a dynamic array?", choices: ["O(1)", "O(n)", "O(log n)", "O(n log n)"], correctIndex: 0, category: "computer science" },
  { difficulty: 10, prompt: "In the Byzantine Generals Problem, what fraction of generals must be honest for consensus?", choices: ["More than 1/2", "More than 2/3", "More than 3/4", "All of them"], correctIndex: 1, category: "computer science" },
  { difficulty: 10, prompt: "What is the Curry-Howard correspondence?", choices: ["A sorting algorithm", "Relation between proofs and programs", "A network protocol", "A database normalization form"], correctIndex: 1, category: "computer science" },
];

async function seed() {
  console.log('🌱 Starting database seed...');
  
  // Initialize database
  initializeDatabase();
  
  // Check if already seeded
  const count = queries.getQuestionCount.get() as { count: number };
  if (count.count > 0) {
    console.log(`ℹ️ Database already has ${count.count} questions. Skipping seed.`);
    return;
  }
  
  // Insert questions
  const insertMany = db.transaction((items: typeof questions) => {
    for (const q of items) {
      queries.insertQuestion.run(
        uuidv4(),
        q.difficulty,
        q.prompt,
        JSON.stringify(q.choices),
        q.correctIndex,
        q.category
      );
    }
  });
  
  insertMany(questions);
  
  console.log(`✅ Seeded ${questions.length} questions`);
  
  // Summary by difficulty
  for (let d = 1; d <= 10; d++) {
    const qs = queries.getQuestionsByDifficulty.all(d) as any[];
    console.log(`   Difficulty ${d}: ${qs.length} questions`);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
