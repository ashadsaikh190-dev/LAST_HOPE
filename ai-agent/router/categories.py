from enum import Enum
from typing import List, Dict, Any

class QueryCategory(str, Enum):
    UNIVERSITY_KNOWLEDGE = "UNIVERSITY_KNOWLEDGE"
    ADMISSION = "ADMISSION"
    ELIGIBILITY = "ELIGIBILITY"
    FEES = "FEES"
    SCHOLARSHIP = "SCHOLARSHIP"
    PROGRAM = "PROGRAM"
    STUDENT_STATUS = "STUDENT_STATUS"
    DOCUMENT = "DOCUMENT"
    APPLICATION = "APPLICATION"
    GENERAL = "GENERAL"
    MIXED = "MIXED"
    UNKNOWN = "UNKNOWN"

# Anchor reference descriptions and exemplary queries for semantic embedding matching
CATEGORY_ANCHORS: Dict[QueryCategory, List[str]] = {
    QueryCategory.FEES: [
        "What is the tuition fee for B.Tech CSE?",
        "How much does the MBA program cost per year?",
        "Total program tuition and application registration fee",
        "Hostel fees and mess charges payment schedule",
        "Cost of engineering course tuition and semester payments",
    ],
    QueryCategory.ELIGIBILITY: [
        "What are the eligibility criteria for Computer Science?",
        "I have 45% in my 12th board, am I eligible for admission?",
        "Minimum 10th and 12th PCM marks cutoff percentage needed",
        "Am I eligible for B.Tech AI & Data Science with 70% marks?",
        "Qualifying cutoff marks for mechanical engineering admission",
    ],
    QueryCategory.SCHOLARSHIP: [
        "I cannot afford the tuition fee, can I get a fee waiver or scholarship?",
        "Financial aid and merit-based scholarship discount application",
        "Fee concession for economically weaker students",
        "How to apply for institutional financial assistance",
    ],
    QueryCategory.PROGRAM: [
        "What degree programs and engineering branches are offered at the university?",
        "Tell me about the B.Tech and MBA course offerings in the college",
        "Which degree courses are available for admission?",
        "List all active engineering departments and programs",
    ],
    QueryCategory.DOCUMENT: [
        "Are all my uploaded marksheets and documents verified?",
        "Check my Aadhaar card and 10th 12th certificate OCR verification status",
        "Which documents are missing from my application profile?",
        "I uploaded the wrong marksheet, how do I replace it?",
    ],
    QueryCategory.STUDENT_STATUS: [
        "What is my current admission stage and application progress?",
        "What is my official university enrollment roll number?",
        "Have I received my provisional admission offer letter?",
        "Has my admission payment been verified?",
    ],
    QueryCategory.APPLICATION: [
        "How do I complete my online application wizard steps?",
        "When is the last date to apply for university admission?",
        "How to submit application and pay the registration fee?",
        "Submit student application form details",
    ],
    QueryCategory.UNIVERSITY_KNOWLEDGE: [
        "What is the university NIRF ranking and NAAC accreditation score?",
        "Tell me about campus placement statistics, recruiters, and highest package",
        "Tell me about campus facilities, hostels, digital library, and sports arena",
        "Who is the admissions counselor and how can I contact them?",
    ],
    QueryCategory.GENERAL: [
        "What is artificial intelligence and machine learning?",
        "What is the difference between CSE and AI/ML?",
        "Difference between computer science and data science as a field",
        "Which branch is better CSE or Artificial Intelligence for career growth?",
        "Write a Python function to reverse a binary tree",
        "Explain how cloud computing and neural networks work",
        "What programming languages should I learn in my first year of college?",
        "Solve 45 * 12 + 100",
        "Tell me a joke about software engineers",
        "Give me study tips for physics and mathematics",
        "What career options are available in tech after graduation?",
    ],
}

# Categories strictly requiring verified database / tool grounding
DATABASE_GROUNDED_CATEGORIES = {
    QueryCategory.FEES,
    QueryCategory.ELIGIBILITY,
    QueryCategory.SCHOLARSHIP,
    QueryCategory.PROGRAM,
    QueryCategory.DOCUMENT,
    QueryCategory.STUDENT_STATUS,
    QueryCategory.APPLICATION,
    QueryCategory.UNIVERSITY_KNOWLEDGE,
}
