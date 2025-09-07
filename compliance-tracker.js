// Compliance Tracking System for MCP (Indeks Pencegahan Korupsi)
// Version 1.0 - Taxpayer Management Module

class ComplianceTracker {
    constructor() {
        this.complianceRules = {
            ktp: { weight: 25, required: true, label: 'KTP' },
            npwp: { weight: 25, required: true, label: 'NPWP' },
            domisili: { weight: 20, required: true, label: 'Domisili' },
            foto: { weight: 15, required: false, label: 'Foto' },
            npwpd: { weight: 15, required: true, label: 'NPWPD' }
        };

        this.complianceStatuses = {
            compliant: { label: '✅ Compliant', color: '#28a745' },
            warning: { label: '⚠️ Warning', color: '#ffc107' },
            non_compliant: { label: '❌ Non Compliant', color: '#dc3545' },
            unknown: { label: '❓ Unknown', color: '#6c757d' }
        };
    }

    calculateComplianceScore(wpData) {
        let totalScore = 0;
        let maxScore = 0;

        Object.entries(this.complianceRules).forEach(([field, rule]) => {
            maxScore += rule.weight;

            if (rule.required) {
                if (wpData[field] && wpData[field].trim() !== '') {
                    totalScore += rule.weight;
                }
            } else {
                // Optional field - partial credit
                if (wpData[field] && wpData[field].trim() !== '') {
                    totalScore += rule.weight * 0.8;
                }
            }
        });

        return Math.round((totalScore / maxScore) * 100);
    }

    determineComplianceStatus(score) {
        if (score >= 90) return 'compliant';
        if (score >= 70) return 'warning';
        return 'non_compliant';
    }

    validateRequiredDocuments(documents) {
        const required = ['ktp', 'npwp', 'domisili'];
        return required.every(doc =>
            documents.some(d => d.document === doc && d.status === 'completed')
        );
    }

    generateComplianceReport(wpData) {
        const score = this.calculateComplianceScore(wpData);
        const status = this.determineComplianceStatus(score);

        const report = {
            npwpd: wpData.NPWPD,
            namaUsaha: wpData['Nama Usaha'],
            complianceScore: score,
            complianceStatus: status,
            lastCheck: new Date().toISOString(),
            details: {}
        };

        // Generate detailed breakdown
        Object.entries(this.complianceRules).forEach(([field, rule]) => {
            const hasData = wpData[field] && wpData[field].trim() !== '';
            report.details[field] = {
                label: rule.label,
                required: rule.required,
                completed: hasData,
                weight: rule.weight,
                score: hasData ? rule.weight : 0
            };
        });

        return report;
    }

    getComplianceBadge(status) {
        return this.complianceStatuses[status] || this.complianceStatuses.unknown;
    }

    getMissingDocuments(wpData) {
        const missing = [];

        Object.entries(this.complianceRules).forEach(([field, rule]) => {
            if (rule.required) {
                const hasData = wpData[field] && wpData[field].trim() !== '';
                if (!hasData) {
                    missing.push({
                        field,
                        label: rule.label,
                        weight: rule.weight
                    });
                }
            }
        });

        return missing;
    }
}

// Global instance
const complianceTracker = new ComplianceTracker();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComplianceTracker;
}