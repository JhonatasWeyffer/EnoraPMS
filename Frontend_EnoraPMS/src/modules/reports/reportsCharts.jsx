import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function ReportsChart({ data }) {
  const ref = useRef();

  useEffect(() => {
    if(!ref.current) return;

    const chart = new Chart(ref.current,{
      type:"bar",
      data:{
        labels:data.labels,
        datasets:[{ data:data.values }]
      }
    });

    return ()=> chart.destroy();
  },[data]);

  return <canvas ref={ref} />;
}