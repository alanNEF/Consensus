"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface DemographicsChartsProps {
  counts: Record<string, Record<string, number>>;
  chartHeight?: number;
  outerRadius?: number;
  innerRadius?: number;
}

// Color palette for charts
const COLORS = [
  "#667eea",
  "#764ba2",
  "#f093fb",
  "#4facfe",
  "#00f2fe",
  "#43e97b",
  "#fa709a",
  "#fee140",
  "#30cfd0",
  "#a8edea",
  "#fed6e3",
  "#ffecd2",
];

// Extended color palette for more categories
const EXTENDED_COLORS = [
  ...COLORS,
  "#ff9a9e",
  "#fecfef",
  "#fecfef",
  "#e0c3fc",
  "#8ec5fc",
  "#d299c2",
  "#fad0c4",
  "#ffd1ff",
  "#a1c4fd",
  "#c2e9fb",
  "#ffecd2",
  "#fcb69f",
];

export default function DemographicsCharts({ 
  counts, 
  chartHeight = 300,
  outerRadius = 100,
  innerRadius = 50
}: DemographicsChartsProps) {
  // Helper function to format field names
  const formatFieldName = (field: string): string => {
    return field
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Helper function to format values
  const formatValue = (value: string): string => {
    return value
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Convert counts to chart data format
  const getChartData = (fieldCounts: Record<string, number>) => {
    return Object.entries(fieldCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], index) => ({
        name: formatValue(name),
        value,
        color: EXTENDED_COLORS[index % EXTENDED_COLORS.length],
      }));
  };

  // Custom tooltip
  interface LabelEntry {
    name: string;
    value: number;
    total: number;
  }
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      payload: LabelEntry;
    }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const total = data.payload.total;
      const percent = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="customTooltip">
          <p className="tooltipLabel">{`${data.name}`}</p>
          <p className="tooltipValue">
            {`${data.value} (${percent}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="demographicsGrid">
      {Object.entries(counts).map(([field, fieldCounts]) => {
        if (Object.keys(fieldCounts).length === 0) {
          return null;
        }

        const chartData = getChartData(fieldCounts);
        const total = chartData.reduce((sum, item) => sum + item.value, 0);

        // Add total to each data point for percentage calculation
        const dataWithTotal = chartData.map((item) => ({
          ...item,
          total,
        }));

        return (
          <div key={field} className="demographicSection">
            <h2 className="demographicSectionTitle">
              {formatFieldName(field)}
            </h2>
            <div className="chartContainer">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                  <Pie
                    data={dataWithTotal}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={outerRadius}
                    innerRadius={innerRadius}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataWithTotal.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ color: 'white' }}
                    iconType="circle"
                    formatter={(value, entry) => {
                      const payload = entry.payload as LabelEntry | undefined;
                      if (payload) {
                        const percent = ((payload.value / payload.total) * 100).toFixed(1);
                        return `${value} (${percent}%)`;
                      }
                      return value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="demographicSummary">
              <p className="demographicTotal">Total: {total}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

