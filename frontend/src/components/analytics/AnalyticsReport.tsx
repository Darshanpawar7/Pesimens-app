import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { TagFrequency } from './TopicFrequencyChart'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#1e293b' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#64748b', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, color: '#1d4ed8' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 4 },
  headerRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 5, paddingHorizontal: 4 },
  col1: { flex: 1 },
  col2: { width: 60, textAlign: 'right' },
  col3: { width: 80, textAlign: 'right' },
  filterChip: { backgroundColor: '#dbeafe', color: '#1d4ed8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, fontSize: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: '#94a3b8' },
})

interface Props {
  tags: TagFrequency[]
  filters: { subject: string; exam_type: string }
  generatedAt: string
}

export function AnalyticsReportPDF({ tags, filters, generatedAt }: Props) {
  const total = tags.reduce((s, t) => s + t.count, 0)

  return (
    <Document title="PESU Hub Analytics Report">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>PESU Hub — Analytics Report</Text>
        <Text style={styles.subtitle}>Generated on {generatedAt}</Text>

        {/* Applied filters */}
        {(filters.subject || filters.exam_type) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Applied Filters</Text>
            <View style={styles.filterRow}>
              {filters.subject && <Text style={styles.filterChip}>Subject: {filters.subject}</Text>}
              {filters.exam_type && <Text style={styles.filterChip}>Exam: {filters.exam_type}</Text>}
            </View>
          </View>
        )}

        {/* Topic frequency table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top {tags.length} Topics by Frequency</Text>

          <View style={styles.headerRow}>
            <Text style={styles.col1}>Topic</Text>
            <Text style={styles.col2}>Count</Text>
            <Text style={styles.col3}>% of Total</Text>
          </View>

          {tags.map((tag, i) => (
            <View key={tag.id} style={[styles.row, { backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }]}>
              <Text style={styles.col1}>{tag.name}</Text>
              <Text style={styles.col2}>{tag.count}</Text>
              <Text style={styles.col3}>{total > 0 ? ((tag.count / total) * 100).toFixed(1) : 0}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>PESU Hub · pesuhub.in · This report is auto-generated</Text>
      </Page>
    </Document>
  )
}
