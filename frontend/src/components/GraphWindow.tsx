
interface Props {
  graphData: any;
}

export default function GraphWindow({ graphData }: Props) {
  if (!graphData) return null;

  return (
    <div
      style={{
        marginTop: 40,
        padding: 20,
        borderRadius: 12,
        background: "#11151b",
        boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
      }}
    >
      <h2 style={{ marginBottom: 10 }}>Graph</h2>

      <div
        style={{
          height: "500px",
          borderRadius: 8,
          background: "#0d1117",
          border: "1px solid #2d3748",
          padding: 10,
          overflow: "auto",
          color: "#cbd5e1",
        }}
      >
        <pre>{JSON.stringify(graphData, null, 2)}</pre>
      </div>
    </div>
  );
}
