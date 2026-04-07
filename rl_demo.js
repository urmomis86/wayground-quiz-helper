// Simple reinforcement learning demo: epsilon-greedy multi-armed bandit.
// Run with: node rl_demo.js

function rand() {
  return Math.random();
}

function sampleReward(prob) {
  return rand() < prob ? 1 : 0;
}

const arms = [
  { name: 'Arm A', p: 0.10 },
  { name: 'Arm B', p: 0.35 },
  { name: 'Arm C', p: 0.25 },
  { name: 'Arm D', p: 0.40 }
];

const totalSteps = 1000;
let epsilon = 0.2;
const minEpsilon = 0.02;
const decay = 0.995;

const counts = new Array(arms.length).fill(0);
const values = new Array(arms.length).fill(0);

for (let t = 1; t <= totalSteps; t += 1) {
  const explore = rand() < epsilon;
  let action = 0;
  if (explore) {
    action = Math.floor(rand() * arms.length);
  } else {
    let best = 0;
    let bestVal = values[0];
    for (let i = 1; i < arms.length; i += 1) {
      if (values[i] > bestVal) {
        bestVal = values[i];
        best = i;
      }
    }
    action = best;
  }

  const reward = sampleReward(arms[action].p);
  counts[action] += 1;
  const n = counts[action];
  values[action] += (reward - values[action]) / n;

  epsilon = Math.max(minEpsilon, epsilon * decay);
}

console.log('RL demo (epsilon-greedy bandit)');
console.log('Steps:', totalSteps);
console.log('Final epsilon:', epsilon.toFixed(4));
console.log('');

arms.forEach((arm, i) => {
  console.log(
    `${arm.name} | true p=${arm.p.toFixed(2)} | chosen=${counts[i]} | Q=${values[i].toFixed(3)}`
  );
});

let bestIdx = 0;
for (let i = 1; i < values.length; i += 1) {
  if (values[i] > values[bestIdx]) bestIdx = i;
}
console.log('');
console.log('Best learned arm:', arms[bestIdx].name);
