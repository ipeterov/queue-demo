import { useMemo } from 'react';

interface Props {
  totalTimes: number[];
}

const calculatePercentile = (sortedArr: number[], p: number): number => {
  if (sortedArr.length === 0) return 0;
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
};

export const Percentiles = ({ totalTimes }: Props) => {
  const percentiles = useMemo(() => {
    if (totalTimes.length === 0) {
      return { p50: 0, p75: 0, p90: 0, p99: 0 };
    }

    const sorted = [...totalTimes].sort((a, b) => a - b);

    return {
      p50: calculatePercentile(sorted, 50),
      p75: calculatePercentile(sorted, 75),
      p90: calculatePercentile(sorted, 90),
      p99: calculatePercentile(sorted, 99),
    };
  }, [totalTimes]);

  if (totalTimes.length === 0) {
    return (
      <div className="percentiles-empty">
        <p>No data yet</p>
      </div>
    );
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="percentiles">
      <div className="percentile-row">
        <span className="percentile-label">p50</span>
        <span className="percentile-value">{formatTime(percentiles.p50)}</span>
      </div>
      <div className="percentile-row">
        <span className="percentile-label">p75</span>
        <span className="percentile-value">{formatTime(percentiles.p75)}</span>
      </div>
      <div className="percentile-row">
        <span className="percentile-label">p90</span>
        <span className="percentile-value">{formatTime(percentiles.p90)}</span>
      </div>
      <div className="percentile-row">
        <span className="percentile-label">p99</span>
        <span className="percentile-value">{formatTime(percentiles.p99)}</span>
      </div>
    </div>
  );
};
