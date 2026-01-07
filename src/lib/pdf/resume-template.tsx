import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

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
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 40,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 8,
  },
  contact: {
    fontSize: 10,
    textAlign: "center",
    color: "#666",
    marginBottom: 4,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 2,
  },
  date: {
    fontSize: 9,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 10,
    marginBottom: 6,
    textAlign: "justify",
  },
  bulletList: {
    marginLeft: 10,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bullet: {
    width: 10,
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
  content: TipTapNode;
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
      const isContact = text.includes("📧") || text.includes("📱") || text.includes("@");

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
  const nodes = content.content || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {nodes.map((node, index) => renderNode(node, index))}
      </Page>
    </Document>
  );
}

export { renderToStream } from "@react-pdf/renderer";
