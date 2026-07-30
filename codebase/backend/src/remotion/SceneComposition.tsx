import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SceneRenderProps } from "./scene-render-types.js";

const colors = {
  background: "#071226",
  panel: "#10233f",
  panelLight: "#17345c",
  text: "#f7fbff",
  muted: "#b9c8dc",
  accent: "#4da3ff",
  accentBright: "#73e0c1",
  warning: "#ffcc66",
};

const fontFamily =
  '"Segoe UI", "Noto Sans", Arial, Helvetica, sans-serif';

const base: React.CSSProperties = {
  fontFamily,
  color: colors.text,
  background:
    "radial-gradient(circle at 85% 10%, #173f72 0%, #071226 42%, #040a15 100%)",
};

const panel: React.CSSProperties = {
  background: "rgba(16, 35, 63, 0.92)",
  border: "1px solid rgba(115, 224, 193, 0.22)",
  borderRadius: 28,
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
};

function Frame({
  children,
  scene,
  visualStyle,
}: {
  children: React.ReactNode;
  scene: SceneRenderProps["scene"];
  visualStyle: SceneRenderProps["visualStyle"];
}) {
  const styleOverrides: Record<
    SceneRenderProps["visualStyle"],
    React.CSSProperties
  > = {
    modern_minimal: {},
    academic: {
      background:
        "radial-gradient(circle at 15% 10%, #30445e 0%, #111c2b 42%, #080d14 100%)",
    },
    dynamic: {
      background:
        "radial-gradient(circle at 85% 10%, #7c3aed 0%, #312e81 38%, #111827 100%)",
    },
  };
  return (
    <AbsoluteFill
      style={{ ...base, ...styleOverrides[visualStyle], padding: 72 }}
    >
      <div
        style={{
          position: "absolute",
          top: 38,
          left: 72,
          fontSize: 24,
          fontWeight: 700,
          color: colors.accentBright,
          letterSpacing: 1.4,
          textTransform: "uppercase",
        }}
      >
        AI Lecture Video
      </div>
      <div
        style={{
          position: "absolute",
          top: 38,
          right: 72,
          fontSize: 21,
          color: colors.muted,
        }}
      >
        {scene.chapter_id}
      </div>
      <div
        style={{
          position: "absolute",
          inset: "96px 72px 66px",
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 72,
          right: 72,
          display: "flex",
          justifyContent: "space-between",
          color: colors.muted,
          fontSize: 18,
        }}
      >
        <span>{scene.scene_id}</span>
        <span>
          {scene.visual.source_ids.length
            ? `Nguồn: ${scene.visual.source_ids.join(", ")}`
            : "Nội dung hướng dẫn"}
        </span>
      </div>
    </AbsoluteFill>
  );
}

function TitleScene({ props }: { props: Record<string, unknown> }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });
  const translate = interpolate(frame, [0, 18], [34, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        ...panel,
        height: "100%",
        padding: "80px 96px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        opacity,
        transform: `translateY(${translate}px)`,
      }}
    >
      <div
        style={{
          color: colors.accentBright,
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 28,
        }}
      >
        {String(props.chapter_label)}
      </div>
      <div
        style={{
          fontSize: 74,
          lineHeight: 1.08,
          fontWeight: 800,
          maxWidth: 1450,
        }}
      >
        {String(props.title)}
      </div>
      <div
        style={{
          height: 6,
          width: 180,
          borderRadius: 4,
          background: colors.accent,
          margin: "34px 0",
        }}
      />
      <div
        style={{
          color: colors.muted,
          fontSize: 32,
          lineHeight: 1.35,
          maxWidth: 1350,
        }}
      >
        {String(props.subtitle)}
      </div>
    </div>
  );
}

function OriginalPageScene({
  props,
  imageSrc,
}: {
  props: Record<string, unknown>;
  imageSrc: string | null;
}) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 90], [1, 1.025], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 420px",
        gap: 38,
        height: "100%",
      }}
    >
      <div
        style={{
          ...panel,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 24,
        }}
      >
        {imageSrc ? (
          <Img
            src={imageSrc}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              transform: `scale(${scale})`,
            }}
          />
        ) : (
          <div style={{ color: colors.warning, fontSize: 30 }}>
            Không tải được trang nguồn
          </div>
        )}
      </div>
      <div
        style={{
          ...panel,
          padding: 38,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: colors.accentBright,
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 18,
          }}
        >
          TRANG {String(props.page)}
        </div>
        <div style={{ fontSize: 40, lineHeight: 1.18, fontWeight: 750 }}>
          {String(props.caption)}
        </div>
      </div>
    </div>
  );
}

function CropScene({
  props,
  imageSrc,
}: {
  props: Record<string, unknown>;
  imageSrc: string | null;
}) {
  const bbox = props.crop_bbox as [number, number, number, number];
  const [x, y, width, height] = bbox;
  const sourceWidth = Number(props.image_width);
  const sourceHeight = Number(props.image_height);
  const video = useVideoConfig();
  const containerWidth = video.width - 200;
  const containerHeight = video.height - 218;
  const imageScale = Math.min(
    containerWidth / sourceWidth,
    containerHeight / sourceHeight,
  );
  const displayWidth = sourceWidth * imageScale;
  const displayHeight = sourceHeight * imageScale;
  const offsetX = (containerWidth - displayWidth) / 2;
  const offsetY = (containerHeight - displayHeight) / 2;
  const frame = useCurrentFrame();
  const pulse = interpolate(frame % 30, [0, 15, 29], [0.72, 1, 0.72]);
  const normalized =
    Math.max(x, y, width, height) <= 1
      ? {
          x: offsetX + x * displayWidth,
          y: offsetY + y * displayHeight,
          width: width * displayWidth,
          height: height * displayHeight,
        }
      : {
          x: offsetX + x * imageScale,
          y: offsetY + y * imageScale,
          width: width * imageScale,
          height: height * imageScale,
        };
  return (
    <div style={{ ...panel, height: "100%", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 28 }}>
        {imageSrc ? (
          <Img
            src={imageSrc}
            style={{
              position: "absolute",
              left: offsetX,
              top: offsetY,
              width: displayWidth,
              height: displayHeight,
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            left: normalized.x,
            top: normalized.y,
            width: normalized.width,
            height: normalized.height,
            border: `6px solid ${colors.warning}`,
            borderRadius: 12,
            boxShadow: `0 0 0 9999px rgba(3, 8, 18, ${0.38 * pulse})`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 42,
          bottom: 34,
          maxWidth: 920,
          background: "rgba(7, 18, 38, 0.92)",
          padding: "18px 26px",
          borderRadius: 16,
          fontSize: 30,
          fontWeight: 700,
        }}
      >
        {String(props.caption)}
      </div>
    </div>
  );
}

function BulletScene({ props }: { props: Record<string, unknown> }) {
  const bullets = props.bullets as string[];
  return (
    <div style={{ ...panel, height: "100%", padding: "62px 72px" }}>
      <div style={{ fontSize: 54, lineHeight: 1.12, fontWeight: 800 }}>
        {String(props.heading)}
      </div>
      <div
        style={{
          width: 130,
          height: 6,
          background: colors.accent,
          borderRadius: 4,
          margin: "28px 0 38px",
        }}
      />
      <div style={{ display: "grid", gap: 24 }}>
        {bullets.map((bullet, index) => (
          <div
            key={`${bullet}-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: "44px 1fr",
              gap: 20,
              alignItems: "start",
              fontSize: 34,
              lineHeight: 1.28,
              color: colors.text,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                background: index === 0 ? colors.accent : colors.panelLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 19,
                fontWeight: 800,
              }}
            >
              {index + 1}
            </div>
            <div>{bullet}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagramScene({ props }: { props: Record<string, unknown> }) {
  const nodes = props.nodes as Array<{ id: string; label: string }>;
  const edges = props.edges as Array<{
    from: string;
    to: string;
    label: string;
  }>;
  return (
    <div style={{ ...panel, height: "100%", padding: "44px 52px" }}>
      <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 34 }}>
        {String(props.title)}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(4, nodes.length)}, minmax(0, 1fr))`,
          gap: 22,
        }}
      >
        {nodes.map((node) => (
          <div
            key={node.id}
            style={{
              background: colors.panelLight,
              border: `2px solid ${colors.accent}`,
              borderRadius: 18,
              minHeight: 104,
              padding: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontSize: 28,
              fontWeight: 750,
            }}
          >
            {node.label}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 34,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 15,
        }}
      >
        {edges.map((edge, index) => (
          <div
            key={`${edge.from}-${edge.to}-${index}`}
            style={{
              borderLeft: `4px solid ${colors.accentBright}`,
              background: "rgba(23, 52, 92, 0.7)",
              borderRadius: 10,
              padding: "14px 18px",
              fontSize: 22,
            }}
          >
            <strong>{edge.from}</strong>
            <span style={{ color: colors.accentBright }}> → </span>
            <strong>{edge.to}</strong>
            {edge.label ? (
              <span style={{ color: colors.muted }}> · {edge.label}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryScene({ props }: { props: Record<string, unknown> }) {
  const points = props.points as string[];
  return (
    <div style={{ ...panel, height: "100%", padding: "58px 72px" }}>
      <div
        style={{
          color: colors.accentBright,
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 1.4,
          marginBottom: 15,
        }}
      >
        TỔNG KẾT CHƯƠNG
      </div>
      <div style={{ fontSize: 56, fontWeight: 850, marginBottom: 34 }}>
        {String(props.title)}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: points.length > 3 ? "1fr 1fr" : "1fr",
          gap: 22,
        }}
      >
        {points.map((point, index) => (
          <div
            key={`${point}-${index}`}
            style={{
              background: colors.panelLight,
              borderRadius: 18,
              padding: "22px 26px",
              fontSize: 30,
              lineHeight: 1.24,
              borderLeft: `6px solid ${
                index % 2 ? colors.accentBright : colors.accent
              }`,
            }}
          >
            {point}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SceneComposition({
  scene,
  resolvedImageSrc,
  visualStyle,
}: SceneRenderProps) {
  const props = scene.visual.props;
  let content: React.ReactNode;
  if (scene.visual.type === "TITLE") {
    content = <TitleScene props={props} />;
  } else if (scene.visual.type === "ORIGINAL_PAGE") {
    content = (
      <OriginalPageScene props={props} imageSrc={resolvedImageSrc} />
    );
  } else if (scene.visual.type === "CROP_AND_HIGHLIGHT") {
    content = <CropScene props={props} imageSrc={resolvedImageSrc} />;
  } else if (scene.visual.type === "DIAGRAM") {
    content = <DiagramScene props={props} />;
  } else if (scene.visual.type === "SUMMARY") {
    content = <SummaryScene props={props} />;
  } else {
    content = <BulletScene props={props} />;
  }
  return <Frame scene={scene} visualStyle={visualStyle}>{content}</Frame>;
}
