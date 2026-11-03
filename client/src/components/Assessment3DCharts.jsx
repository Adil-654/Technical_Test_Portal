
import React, { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const COLORS = {
  correct: "#22c55e",
  incorrect: "#f97316",
  unanswered: "#64748b",
  Strong: "#22c55e",
  Average: "#f59e0b",
  Weak: "#ef4444",
};

function makeDonutGeometry(startAngle, endAngle, innerRadius = 0.85, outerRadius = 1.45) {
  const shape = new THREE.Shape();
  const steps = Math.max(8, Math.ceil((endAngle - startAngle) * 24));

  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + ((endAngle - startAngle) * i) / steps;
    const x = Math.cos(angle) * outerRadius;
    const y = Math.sin(angle) * outerRadius;

    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  for (let i = steps; i >= 0; i--) {
    const angle = startAngle + ((endAngle - startAngle) * i) / steps;
    shape.lineTo(
      Math.cos(angle) * innerRadius,
      Math.sin(angle) * innerRadius
    );
  }

  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
}

function DonutSegment({ start, end, color, label, value, total }) {
  const [hovered, setHovered] = useState(false);

  const geometry = useMemo(
    () => makeDonutGeometry(start, end),
    [start, end]
  );

  return (
    <group
      rotation={[0, 0, 0]}
      position={[0, 0, hovered ? 0.12 : 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          metalness={0.25}
          roughness={0.35}
          emissive={color}
          emissiveIntensity={hovered ? 0.22 : 0.04}
        />
      </mesh>

      {hovered && (
        <Html center distanceFactor={8}>
          <div className="rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-center text-xs text-white shadow-xl whitespace-nowrap">
            <div className="font-semibold">{label}</div>
            <div>{value} questions</div>
            <div>
              {total ? Math.round((value / total) * 100) : 0}%
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function DonutChart({ summary }) {
  const items = [
    { label: "Correct", value: Number(summary.correct) || 0, color: COLORS.correct },
    { label: "Incorrect", value: Number(summary.incorrect) || 0, color: COLORS.incorrect },
    { label: "Unanswered", value: Number(summary.unanswered) || 0, color: COLORS.unanswered },
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = Math.PI / 2;

  if (!total) {
    return (
      <Html center>
        <span className="text-sm text-slate-400">No question data</span>
      </Html>
    );
  }

  return (
    <group>
      {items.map((item) => {
        const angle = (item.value / total) * Math.PI * 2;
        const start = currentAngle;
        const end = currentAngle + angle;
        currentAngle = end;

        if (!item.value) return null;

        return (
          <DonutSegment
            key={item.label}
            start={start}
            end={end}
            color={item.color}
            label={item.label}
            value={item.value}
            total={total}
          />
        );
      })}

      <mesh position={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.65, 0.65, 0.12, 48]} />
        <meshStandardMaterial color="#111827" roughness={0.8} />
      </mesh>
    </group>
  );
}

function TopicBars({ topics }) {
  const categories = ["Strong", "Average", "Weak"];

  const counts = categories.map((category) =>
    topics.filter((topic) => topic.performance === category).length
  );

  const maxCount = Math.max(...counts, 1);

  return (
    <group>
      {categories.map((category, index) => {
        const height = Math.max((counts[index] / maxCount) * 2.4, 0.04);
        const x = (index - 1) * 1.65;

        return (
          <group key={category} position={[x, 0, 0]}>
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[0.85, height, 0.85]} />
              <meshStandardMaterial
                color={COLORS[category]}
                metalness={0.25}
                roughness={0.35}
              />
            </mesh>

            <Html position={[0, height + 0.25, 0]} center distanceFactor={8}>
              <div className="rounded-md bg-slate-950/90 px-2 py-1 text-center text-xs text-white whitespace-nowrap">
                <strong>{counts[index]}</strong>
                <div>{category}</div>
              </div>
            </Html>

            <mesh position={[0, -0.06, 0]}>
              <boxGeometry args={[1.1, 0.08, 1.1]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function ChartScene({ children, cameraPosition = [0, 0, 6] }) {
  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[4, 5, 6]} intensity={2} />
      <pointLight position={[-4, -2, 3]} intensity={1} />

      <Suspense
        fallback={
          <Html center>
            <span className="text-sm text-slate-400">Loading chart...</span>
          </Html>
        }
      >
        {children}
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.7}
      />
    </Canvas>
  );
}

function ChartCard({ title, subtitle, children, legend }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-lg">
      <div className="mb-2">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="h-64 w-full">{children}</div>

      {legend && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-2">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-slate-300">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Assessment3DCharts({ review }) {
  const summary = review?.summary || {};
  const topics = Array.isArray(review?.topics) ? review.topics : [];

  const outcomeLegend = [
    { label: `Correct (${summary.correct || 0})`, color: COLORS.correct },
    { label: `Incorrect (${summary.incorrect || 0})`, color: COLORS.incorrect },
    { label: `Unanswered (${summary.unanswered || 0})`, color: COLORS.unanswered },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard
        title="Question outcome"
        subtitle="Drag the chart to rotate. Hover over a segment for details."
        legend={outcomeLegend}
      >
        <ChartScene>
          <DonutChart summary={summary} />
        </ChartScene>
      </ChartCard>

      <ChartCard
        title="Topic performance"
        subtitle="Number of topics in each performance category."
        legend={[
          { label: "Strong", color: COLORS.Strong },
          { label: "Average", color: COLORS.Average },
          { label: "Weak", color: COLORS.Weak },
        ]}
      >
        <ChartScene cameraPosition={[0, 2.8, 7]}>
          <TopicBars topics={topics} />
        </ChartScene>
      </ChartCard>
    </div>
  );
}
