export function computeBestPower(
  powerStream: number[],
  durationSeconds: number,
): { bestPower: number; startIndex: number } | null {
  if (durationSeconds > powerStream.length) {
    return null;
  }

  let windowSum = 0;
  for (let i = 0; i < durationSeconds; i++) {
    windowSum += powerStream[i] ?? 0;
  }

  let bestSum = windowSum;
  let bestStart = 0;

  for (let i = durationSeconds; i < powerStream.length; i++) {
    windowSum +=
      (powerStream[i] ?? 0) - (powerStream[i - durationSeconds] ?? 0);
    if (windowSum > bestSum) {
      bestSum = windowSum;
      bestStart = i - durationSeconds + 1;
    }
  }

  return {
    bestPower: Math.round(bestSum / durationSeconds),
    startIndex: bestStart,
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}min`;
  return `${mins}min ${secs}s`;
}
