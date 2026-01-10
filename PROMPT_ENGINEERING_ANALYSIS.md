# Prompt Engineering Analysis: MoonScribe vs. Competitors

**Date:** January 2025  
**Purpose:** Understand how competitors prompt their AI and identify opportunities for improvement

---

## 🔍 What We Know About Competitor Prompting Strategies

### General Industry Patterns (Based on RAG Best Practices)

While specific prompt templates from NotebookLM, Recall, and Mem.ai are proprietary, we can infer their strategies from:
1. **Public RAG research papers**
2. **Industry best practices**
3. **Observed behavior** (how they respond to questions)
4. **Open-source RAG implementations**

### Common Competitor Strategies

#### 1. **NotebookLM (Google) - Likely Approach**

**Inferred Strategy:**
- **Role-based prompting**: "You are a research assistant helping users understand their documents"
- **Context-aware instructions**: Different prompts for different document types (PDFs, YouTube, web)
- **Synthesis-friendly**: Allows connecting information across documents (they're known for good summaries)
- **Citation-heavy**: Always cites sources, likely with page numbers or timestamps
- **Conversational tone**: More natural, less robotic than strict fact-finding

**Likely Prompt Structure:**
```
You are an expert research assistant helping users understand their documents.

You have access to the following sources:
[Source 1], [Source 2], etc.

When answering questions:
- Use information from the provided context
- Synthesize information from multiple sources when relevant
- Cite sources using [1], [2], etc.
- If information is not in the context, say so clearly
- Write in a clear, conversational tone

Context:
[Retrieved chunks with source attribution]

Question: [User question]

Answer:
```

**Key Differences from MoonScribe:**
- ✅ **More permissive for synthesis** - Allows connecting information
- ✅ **Conversational tone** - Less robotic, more natural
- ✅ **Context-aware** - Adapts to document type (PDF vs YouTube vs web)
- ⚠️ **Less strict on hallucination prevention** - May allow some inference

#### 2. **Recall (Microsoft) - Likely Approach**

**Inferred Strategy:**
- **Local-first emphasis**: Prompts emphasize privacy and local processing
- **Note-taking focus**: Prompts optimized for creating notes, not just Q&A
- **Multi-modal awareness**: Handles text, images, web pages differently
- **Citation with links**: Web sources get clickable links, documents get page numbers

**Likely Prompt Structure:**
```
You are a knowledge assistant helping users capture and understand information.

Sources available:
[Source list with types]

Instructions:
- Extract key information from the context
- Create structured notes when appropriate
- Cite sources with links or page numbers
- Preserve important details (dates, names, numbers)
- Organize information logically

Context:
[Chunks with metadata]

User request: [Question or note-taking request]

Response:
```

**Key Differences from MoonScribe:**
- ✅ **Note-taking optimized** - Better at creating structured notes
- ✅ **Multi-modal aware** - Handles different source types differently
- ⚠️ **Less strict on fact-checking** - May allow more inference

#### 3. **ChatGPT with Documents - Known Approach**

**Actual Strategy (from OpenAI documentation):**
- **System message**: Defines role and behavior
- **Context injection**: Documents provided as user messages
- **Citation format**: Uses [Source: filename] format
- **Balanced approach**: Allows some synthesis but warns about limitations

**Known Prompt Structure:**
```
System: You are a helpful assistant that answers questions based on provided documents.
User: [Document 1 content]
User: [Document 2 content]
User: [User question]
```

**Key Differences from MoonScribe:**
- ✅ **Simpler structure** - Less verbose instructions
- ✅ **Document-as-message** - Treats documents as conversation history
- ⚠️ **Less explicit about hallucination** - Relies on model's training

---

## 📊 MoonScribe's Current Approach

### Current Prompt Structure

**For Fact-Finding Questions:**
```
You are an expert research assistant. Analyze the provided context and give a comprehensive, well-structured answer to the question.

[Source list]

CRITICAL INSTRUCTIONS - READ CAREFULLY:
- You MUST ONLY use information that is EXPLICITLY and DIRECTLY stated in the provided context below
- DO NOT use any information from your training data or general knowledge
- DO NOT make up, infer, assume, deduce, or connect information that is not directly stated
- DO NOT provide related information, examples, or context if the direct answer is not found
- If the information needed to answer the question is NOT EXPLICITLY stated in the provided context, you MUST respond with ONLY: "I couldn't find this information in the provided documents."
- Always cite your sources using [1], [2], etc.
- Write in a clear, professional tone

CONTEXT FROM DOCUMENTS (ONLY USE INFORMATION FROM THIS CONTEXT):
[Context chunks with source attribution]

QUESTION: [User question]

Provide a comprehensive answer that directly addresses the question. Remember: ONLY use information from the context above. If the answer is not in the context, say so explicitly.
```

**For Synthesis Tasks (Recently Added):**
```
You are an expert research assistant. The user is asking you to synthesize and summarize information from the provided documents.

[Source list]

CRITICAL INSTRUCTIONS FOR SYNTHESIS TASKS:
- You MUST synthesize information from the provided context below to create a comprehensive answer
- You CAN and SHOULD connect information from different parts of the context to provide a complete answer
- You CAN summarize, analyze, and organize information from the context
- You MUST base your synthesis ONLY on information that is EXPLICITLY stated in the provided context
- DO NOT use any information from your training data or general knowledge
- DO NOT make up facts, numbers, names, or details that are not in the context
- Always cite your sources using [1], [2], etc.
- Write in a clear, professional tone

CONTEXT FROM DOCUMENTS (SYNTHESIZE INFORMATION FROM THIS CONTEXT):
[Context chunks]

QUESTION: [User question]

Provide a comprehensive, synthesized answer that addresses the question using information from the context above.
```

### Strengths of Current Approach

✅ **Strong hallucination prevention** - Very explicit about not using training data  
✅ **Clear citation requirements** - Always cites sources  
✅ **Task-specific prompts** - Different prompts for synthesis vs fact-finding  
✅ **Explicit source attribution** - Clear about which sources are available  
✅ **Professional tone** - Consistent, clear instructions  

### Weaknesses of Current Approach

❌ **Too verbose** - Instructions are very long, may confuse the model  
❌ **Too strict for some tasks** - May prevent legitimate synthesis  
❌ **Repetitive** - Same instructions repeated multiple times  
❌ **Less conversational** - More robotic than competitors  
❌ **No few-shot examples** - Doesn't show the model what good answers look like  
❌ **No chain-of-thought** - Doesn't encourage step-by-step reasoning  

---

## 🎯 Recommendations for Improvement

### 1. **Simplify and Streamline Prompts** (High Priority)

**Current Problem:** Prompts are too verbose and repetitive.

**Recommendation:**
- Reduce instruction length by 50%
- Remove redundant statements
- Use more concise language
- Keep critical instructions but make them shorter

**Example Improved Prompt:**
```
You are a research assistant. Answer questions using ONLY the provided context.

Sources: [Source list]

Rules:
- Use only information explicitly stated in the context
- Cite sources with [1], [2], etc.
- If information isn't in the context, say "I couldn't find this information in the provided documents"
- Write clearly and professionally

Context:
[Chunks with attribution]

Question: [User question]

Answer:
```

**Effort:** 1-2 days  
**Impact:** Medium-High - Better model understanding, faster responses

---

### 2. **Add Few-Shot Examples** (High Priority)

**Current Problem:** Model doesn't see examples of good answers.

**Recommendation:**
- Add 1-2 examples of good answers with proper citations
- Show examples of when to say "not found"
- Demonstrate synthesis for summary tasks

**Example:**
```
You are a research assistant. Answer questions using ONLY the provided context.

Example 1:
Context: [1] Document.pdf: "The study found that exercise improves mood."
Question: "What did the study find?"
Answer: "The study found that exercise improves mood [1]."

Example 2:
Context: [1] Document.pdf: "The study examined exercise."
Question: "What was the sample size?"
Answer: "I couldn't find this information in the provided documents."

[Actual context and question]
```

**Effort:** 2-3 days  
**Impact:** High - Significantly improves answer quality

---

### 3. **Add Chain-of-Thought for Complex Questions** (Medium Priority)

**Current Problem:** Model doesn't show reasoning for complex questions.

**Recommendation:**
- For complex questions, encourage step-by-step reasoning
- Ask model to identify relevant chunks first
- Then synthesize the answer

**Example:**
```
For complex questions, think step by step:
1. Identify which chunks are relevant to the question
2. Extract key information from those chunks
3. Synthesize the information into a coherent answer
4. Cite your sources

Question: [Complex question]
```

**Effort:** 1-2 days  
**Impact:** Medium - Better answers for complex questions

---

### 4. **Context-Aware Prompting** (Medium Priority)

**Current Problem:** Same prompt for all document types.

**Recommendation:**
- Different prompts for PDFs vs YouTube vs web pages
- PDFs: Emphasize page numbers, sections
- YouTube: Emphasize timestamps, video context
- Web: Emphasize URLs, article structure

**Example for PDFs:**
```
You are analyzing a PDF document. When citing information, reference the source document and, if available, the section or page number.

Context from PDF:
[Chunks with page/section info]
```

**Example for YouTube:**
```
You are analyzing a YouTube video transcript. When citing information, reference the timestamp (e.g., "at 2:34").

Context from video:
[Chunks with timestamps]
```

**Effort:** 2-3 days  
**Impact:** Medium - Better citations and context awareness

---

### 5. **Temperature and Model Selection** (Low Priority)

**Current:** Temperature = 0.1 (very deterministic)

**Recommendation:**
- **Fact-finding questions**: Temperature = 0.1 (current) ✅
- **Synthesis tasks**: Temperature = 0.3-0.5 (more creative, better synthesis)
- **Creative tasks**: Temperature = 0.7 (for brainstorming, mind maps)

**Effort:** 1 day  
**Impact:** Medium - Better synthesis for appropriate tasks

---

### 6. **Query Expansion Enhancement** (Already Implemented, Can Improve)

**Current:** Basic keyword expansion

**Recommendation:**
- Use LLM-based expansion for complex queries
- Generate multiple query variations
- Use hybrid search (semantic + keyword)

**Status:** ✅ Query expansion exists, but LLM-based expansion is not used by default

**Effort:** 1-2 days  
**Impact:** Medium - Better retrieval, better answers

---

## 📈 Comparison Matrix

| Feature | MoonScribe | NotebookLM (Inferred) | Recall (Inferred) | ChatGPT |
|---------|------------|------------------------|-------------------|---------|
| **Hallucination Prevention** | ✅ Very Strong | ⚠️ Moderate | ⚠️ Moderate | ⚠️ Moderate |
| **Citation Quality** | ✅ Strong | ✅ Strong | ✅ Strong | ✅ Strong |
| **Synthesis Ability** | ⚠️ Recently Added | ✅ Strong | ✅ Strong | ✅ Strong |
| **Conversational Tone** | ❌ Robotic | ✅ Natural | ✅ Natural | ✅ Natural |
| **Few-Shot Examples** | ❌ None | ✅ Likely | ✅ Likely | ✅ Yes |
| **Chain-of-Thought** | ❌ None | ✅ Likely | ⚠️ Unknown | ✅ Yes |
| **Context-Aware** | ⚠️ Basic | ✅ Strong | ✅ Strong | ⚠️ Basic |
| **Prompt Length** | ❌ Too Long | ✅ Concise | ✅ Concise | ✅ Concise |
| **Task-Specific** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Basic |

---

## 🎯 Priority Recommendations

### Immediate (Next 1-2 Weeks)

1. **Simplify prompts** - Reduce verbosity, keep critical instructions
2. **Add few-shot examples** - Show model what good answers look like
3. **Adjust temperature for synthesis** - Use 0.3-0.5 for summaries/analysis

### Short-term (Next Month)

4. **Context-aware prompting** - Different prompts for PDFs, YouTube, web
5. **Chain-of-thought for complex questions** - Step-by-step reasoning
6. **Improve query expansion** - Use LLM-based expansion for complex queries

### Long-term (Next Quarter)

7. **A/B testing framework** - Test different prompt variations
8. **Prompt optimization** - Use APO (Automatic Prompt Optimization)
9. **User feedback loop** - Learn from user corrections

---

## 💡 Key Insights

### What Competitors Likely Do Better

1. **More concise prompts** - Less verbose, easier for models to parse
2. **Few-shot examples** - Show models what good answers look like
3. **Better synthesis** - More permissive for connecting information
4. **Conversational tone** - Less robotic, more natural
5. **Context-aware** - Adapt to document type (PDF vs YouTube vs web)

### What MoonScribe Does Better

1. **Hallucination prevention** - Very explicit about not using training data
2. **Citation requirements** - Always cites sources clearly
3. **Task-specific prompts** - Different prompts for different tasks
4. **Explicit source attribution** - Clear about available sources

### The Balance

**Key Challenge:** Balance between:
- **Preventing hallucination** (MoonScribe's strength)
- **Allowing synthesis** (Competitors' strength)
- **Maintaining natural tone** (Competitors' strength)

**Solution:** 
- Keep strict hallucination prevention for fact-finding
- Allow more synthesis for summary/analysis tasks (already implemented ✅)
- Improve tone through better prompt structure and few-shot examples

---

## 📝 Implementation Plan

### Phase 1: Quick Wins (1 Week)

- [ ] Simplify fact-finding prompt (reduce by 50%)
- [ ] Simplify synthesis prompt (reduce by 50%)
- [ ] Add 1-2 few-shot examples to each prompt type
- [ ] Adjust temperature: 0.1 for facts, 0.3 for synthesis

### Phase 2: Enhancements (2-3 Weeks)

- [ ] Add context-aware prompting (PDF vs YouTube vs web)
- [ ] Add chain-of-thought for complex questions
- [ ] Improve query expansion (use LLM-based for complex queries)
- [ ] A/B test new prompts vs old prompts

### Phase 3: Optimization (1 Month+)

- [ ] Build prompt A/B testing framework
- [ ] Collect user feedback on answer quality
- [ ] Iterate based on feedback
- [ ] Consider automatic prompt optimization (APO)

---

## 🔗 References

- OpenAI RAG Best Practices: https://platform.openai.com/docs/guides/production-best-practices
- LangChain RAG Prompt Templates: https://python.langchain.com/docs/modules/chains/popular/vector_db_qa
- Anthropic Prompt Engineering Guide: https://docs.anthropic.com/claude/docs/prompt-engineering
- RAG Research Papers:
  - "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Lewis et al., 2020)
  - "In-Context Retrieval-Augmented Language Models" (Ram et al., 2023)

---

**Last Updated:** January 2025  
**Next Review:** After implementing Phase 1 improvements