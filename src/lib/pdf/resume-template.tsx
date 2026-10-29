import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { formatResumeText, isResumeSection } from "@/lib/resume/ats-format";

// 註冊中文字體
Font.register({
  family: "Noto Sans TC",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/notosanstc/v26/-nFuOG829Oofr2wohFbTp9iFOSsLA.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/notosanstc/v26/-nFkOG829Oofr2wohFbTp9i9kwMvDQ.ttf",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Noto Sans TC",
    fontSize: 10,
    color: "#111111",
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 46,
    lineHeight: 1.35,
  },
  header: {
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 4,
  },
  contact: {
    fontSize: 9,
    textAlign: "center",
    color: "#222222",
    marginBottom: 2,
  },
  section: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: "#222222",
    paddingBottom: 2,
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 1,
  },
  date: {
    fontSize: 9,
    color: "#222222",
    fontStyle: "italic",
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 10,
    marginBottom: 3,
    textAlign: "left",
  },
  bulletList: {
    marginLeft: 11,
    marginTop: 1,
    marginBottom: 3,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bullet: {
    width: 9,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  bold: {
    fontWeight: 700,
  },
  italic: {
    fontStyle: "italic",
  },
  underline: {
    textDecoration: "underline",
  },
});

interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: Array<{ type: string }>;
}

interface ResumeTemplateProps {
  content: TipTapNode | string;
  title?: string;
}

function renderMarks(text: string, marks?: Array<{ type: string }>) {
  if (!marks || marks.length === 0) {
    return <Text>{text}</Text>;
  }

  const style: Style = {};
  marks.forEach((mark) => {
    if (mark.type === "bold") style.fontWeight = 700;
    if (mark.type === "italic") style.fontStyle = "italic";
    if (mark.type === "underline") style.textDecoration = "underline";
  });

  return <Text style={style}>{text}</Text>;
}

function renderTextContent(content?: TipTapNode[]): React.ReactNode {
  if (!content) return null;

  return content.map((node, index) => {
    if (node.type === "text" && node.text) {
      return (
        <Text key={index}>
          {renderMarks(node.text, node.marks)}
        </Text>
      );
    }
    return null;
  });
}

function renderNode(node: TipTapNode, index: number): React.ReactNode {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const textAlign = (node.attrs?.textAlign as "left" | "center" | "right") || "left";

      if (level === 1) {
        return (
          <View key={index} style={styles.header}>
            <Text style={[styles.name, { textAlign }]}>
              {renderTextContent(node.content)}
            </Text>
          </View>
        );
      }
      if (level === 2) {
        return (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {renderTextContent(node.content)}
            </Text>
          </View>
        );
      }
      return (
        <Text key={index} style={styles.subTitle}>
          {renderTextContent(node.content)}
        </Text>
      );
    }

    case "paragraph": {
      const textAlign = (node.attrs?.textAlign as "left" | "center" | "right" | "justify") || "left";

      // 檢查是否是聯絡資訊（在 header 後面）
      const text = node.content?.map((n) => n.text || "").join("") || "";
      const isContact = text.includes("📧") || text.includes("📱") || text.includes("📍") || text.includes("@");

      if (isContact) {
        return (
          <Text key={index} style={[styles.contact, { textAlign }]}>
            {renderTextContent(node.content)}
          </Text>
        );
      }

      return (
        <Text key={index} style={[styles.paragraph, { textAlign }]}>
          {renderTextContent(node.content)}
        </Text>
      );
    }

    case "bulletList":
      return (
        <View key={index} style={styles.bulletList}>
          {node.content?.map((item, i) => renderNode(item, i))}
        </View>
      );

    case "listItem":
      return (
        <View key={index} style={styles.bulletItem}>
          <Text style={styles.bullet}>•</Text>
          <View style={styles.bulletText}>
            {node.content?.map((p, i) => {
              if (p.type === "paragraph") {
                return (
                  <Text key={i}>
                    {renderTextContent(p.content)}
                  </Text>
                );
              }
              return renderNode(p, i);
            })}
          </View>
        </View>
      );

    case "orderedList":
      return (
        <View key={index} style={styles.bulletList}>
          {node.content?.map((item, i) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bullet}>{i + 1}.</Text>
              <View style={styles.bulletText}>
                {item.content?.map((p, j) => {
                  if (p.type === "paragraph") {
                    return (
                      <Text key={j}>
                        {renderTextContent(p.content)}
                      </Text>
                    );
                  }
                  return renderNode(p, j);
                })}
              </View>
            </View>
          ))}
        </View>
      );

    case "hardBreak":
      return <Text key={index}>{"\n"}</Text>;

    default:
      return null;
  }
}

export function ResumeTemplate({ content }: ResumeTemplateProps) {
  const nodes = typeof content === "string"
    ? plainTextNodes(formatResumeText(content))
    : content.content || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {nodes.map((node, index) => renderNode(node, index))}
      </Page>
    </Document>
  );
}

function plainTextNodes(text: string): TipTapNode[] {
  return text.split("\n").map((line, index) => {
    if (!line.trim()) return { type: "paragraph", content: [] };
    if (/^-\s+/.test(line)) {
      return {
        type: "bulletList",
        content: [{
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: line.replace(/^-\s+/, "") }] }],
        }],
      };
    }
    if (isResumeSection(line)) {
      return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: line }] };
    }
    return { type: index === 0 ? "heading" : "paragraph", attrs: index === 0 ? { level: 1 } : undefined, content: [{ type: "text", text: line }] };
  });
}

export { renderToStream } from "@react-pdf/renderer";
