const ALLOWED_DOMAINS = ['stu.pes.edu']

export function validateEmailDomain(email: string): boolean {
  const trimmed = email.trim().toLowerCase()
  const atIndex = trimmed.lastIndexOf('@')
  if (atIndex === -1) return false
  const domain = trimmed.slice(atIndex + 1)
  return ALLOWED_DOMAINS.includes(domain)
}

/** Converts a raw SRN like "PES2UG24CS143" to "PES2UG24CS143@stu.pes.edu" */
export function srnToEmail(srn: string): string {
  return `${srn.trim().toUpperCase()}@stu.pes.edu`
}

/** Basic SRN format check — e.g. PES2UG24CS143 */
export function validateSRN(srn: string): boolean {
  // Accept common PESU SRN shapes across programs while rejecting malformed IDs.
  // Examples: PES2UG24CS143, PES2UG24BP026, PES1PG23EC012
  return /^PES\d[A-Z]{2}\d{2}[A-Z]{2}\d{3,4}$/i.test(srn.trim())
}

export function isValidSRN(srn: string): boolean {
  return validateSRN(srn)
}

export function decodeSRN(srn: string): {
  campus: 'EC' | 'RR' | null
  degree: string | null
  branch: string | null
  yearOfJoining: number | null
  currentSemesterGuess: number | null
} | null {
  const raw = srn.trim().toUpperCase()
  if (!raw.startsWith('PES') || raw.length < 11) {
    return {
      campus: null,
      degree: null,
      branch: null,
      yearOfJoining: null,
      currentSemesterGuess: null,
    }
  }

  const campusChar = raw[3]
  const campus: 'EC' | 'RR' | null = campusChar === '1' ? 'RR' : campusChar === '2' ? 'EC' : null

  const programType = raw.slice(4, 6)
  const yearCode = raw.slice(6, 8)
  const branchCode = raw.slice(8, 10)

  const yearNum = Number.parseInt(yearCode, 10)
  const yearOfJoining = Number.isNaN(yearNum) ? null : 2000 + yearNum

  let currentSemesterGuess: number | null = null
  if (yearOfJoining !== null) {
    const currentYearTwoDigits = new Date().getFullYear() - 2000
    const sem = (currentYearTwoDigits - yearNum) * 2 + 1
    currentSemesterGuess = Math.max(1, Math.min(8, sem))
  }

  const branchMap: Record<string, { degree: string | null; branch: string | null; engineering: boolean }> = {
    CS: { degree: null, branch: 'Computer Science & Engineering (CSE)', engineering: true },
    AI: { degree: null, branch: 'Computer Science - AI & ML (CSE-AIML)', engineering: true },
    EC: { degree: null, branch: 'Electronics & Communication Engineering (ECE)', engineering: true },
    EE: { degree: null, branch: 'Electrical & Electronics Engineering (EEE)', engineering: true },
    ME: { degree: null, branch: 'Mechanical Engineering (ME)', engineering: true },
    BT: { degree: null, branch: 'Biotechnology Engineering', engineering: true },
    VL: { degree: null, branch: 'VLSI Design & Embedded Systems', engineering: true },

    MB: { degree: 'MBBS', branch: 'Medicine & Surgery', engineering: false },
    MD: { degree: 'MD', branch: null, engineering: false },
    MS: { degree: 'MS', branch: null, engineering: false },

    BP: { degree: 'B.Pharm', branch: 'Pharmaceutical Sciences', engineering: false },
    PD: { degree: 'Pharm.D', branch: 'Doctor of Pharmacy', engineering: false },
    MP: { degree: 'M.Pharm', branch: null, engineering: false },

    BA: { degree: 'MBA', branch: null, engineering: false },
    MC: { degree: 'MCA', branch: 'Computer Applications', engineering: false },
    BC: { degree: 'BCA', branch: 'Computer Applications', engineering: false },
    BB: { degree: 'BBA', branch: null, engineering: false },
    CM: { degree: 'B.Com (Hons.)', branch: 'Commerce', engineering: false },
    AR: { degree: 'B.Arch', branch: 'Architecture', engineering: false },
    DS: { degree: 'B.Des', branch: null, engineering: false },
    NS: { degree: 'B.Sc Nursing', branch: 'Nursing', engineering: false },
    PT: { degree: 'BPT (Physiotherapy)', branch: 'Physiotherapy', engineering: false },
    LW: { degree: 'BA LLB (Hons.)', branch: 'Arts & Law', engineering: false },
  }

  const mapped = branchMap[branchCode]
  if (!mapped) {
    return {
      campus,
      degree: null,
      branch: null,
      yearOfJoining,
      currentSemesterGuess,
    }
  }

  let degree: string | null = mapped.degree
  let branch: string | null = mapped.branch

  if (degree === null) {
    if (programType === 'UG') {
      degree = mapped.engineering ? 'B.Tech' : null
    } else if (programType === 'PG') {
      degree = mapped.engineering ? 'M.Tech' : degree
    } else if (programType === 'MD') {
      degree = 'MD'
      branch = null
    } else if (programType === 'MS') {
      degree = 'MS'
      branch = null
    }
  }

  return {
    campus,
    degree,
    branch,
    yearOfJoining,
    currentSemesterGuess,
  }
}
