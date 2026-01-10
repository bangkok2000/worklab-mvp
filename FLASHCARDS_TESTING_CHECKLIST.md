# Flashcards Testing Checklist

## ✅ Pre-Test Verification
- [x] No linter errors
- [x] projectId is passed correctly to StudioPanel
- [x] sourceFilenames are passed correctly (filtered for ready documents)
- [x] API route structure matches ask route pattern
- [x] Component imports are correct

## 🧪 Testing Steps

### 1. **UI Navigation Test**
- [ ] Open a project with documents
- [ ] Verify StudioPanel tabs are visible (Chat, Summary, Flashcards, Quiz, Mind Map, Study Guide)
- [ ] Click on "Flashcards" tab
- [ ] Verify FlashcardsPanel loads correctly
- [ ] Verify empty state shows when no flashcards exist

### 2. **Generate Flashcards Test**
- [ ] Click "+ Generate" button
- [ ] Verify loading state shows "⏳ Generating..."
- [ ] Wait for generation to complete
- [ ] Verify flashcards appear (should see 10 flashcards)
- [ ] Verify card counter shows "10 flashcards • Card 1 of 10"

### 3. **Flashcard Interaction Test**
- [ ] Click on flashcard to flip (should show back side)
- [ ] Click again to flip back (should show front side)
- [ ] Click "Next →" button (should move to next card)
- [ ] Click "← Previous" button (should move to previous card)
- [ ] Click on dot indicators (should jump to that card)
- [ ] Verify card resets to front when navigating

### 4. **Persistence Test**
- [ ] Generate flashcards
- [ ] Refresh the page
- [ ] Verify flashcards are still there (loaded from localStorage)
- [ ] Verify current card position is maintained

### 5. **Delete Test**
- [ ] Click "🗑️ Delete Card" button
- [ ] Verify confirmation dialog appears
- [ ] Confirm deletion
- [ ] Verify card is removed
- [ ] Verify navigation adjusts correctly

### 6. **Export Test**
- [ ] Click "📥 Export" button
- [ ] Verify JSON file downloads
- [ ] Open downloaded file
- [ ] Verify JSON structure is correct:
  ```json
  [
    {
      "front": "...",
      "back": "...",
      "source": "..."
    }
  ]
  ```

### 7. **Error Handling Test**
- [ ] Try generating flashcards with no documents
- [ ] Verify error message appears: "No documents available..."
- [ ] Try generating with invalid API key
- [ ] Verify error message appears

### 8. **Multiple Generations Test**
- [ ] Generate first set of flashcards
- [ ] Generate second set (should add to existing)
- [ ] Verify total count increases
- [ ] Verify both sets are accessible

### 9. **Source Attribution Test**
- [ ] Generate flashcards from multiple documents
- [ ] Verify each flashcard shows correct source
- [ ] Verify source names match document names

### 10. **API Route Test (Optional - Direct API Call)**
```bash
curl -X POST http://localhost:3000/api/study/flashcards \
  -H "Content-Type: application/json" \
  -d '{
    "sourceFilenames": ["test-document.pdf"],
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "count": 5
  }'
```
- [ ] Verify response contains flashcards array
- [ ] Verify each flashcard has front, back, source
- [ ] Verify credit deduction works (if using credits)

## 🐛 Known Issues to Watch For
- JSON parsing errors (if AI returns malformed JSON)
- Empty flashcards array (if no relevant content found)
- Credit deduction failures (should not block request)
- localStorage quota exceeded (if too many flashcards)

## 📝 Expected Behavior
1. **Generation**: Takes 5-15 seconds depending on document size
2. **Flashcards**: Should be diverse, covering different topics
3. **Quality**: Front should be concise question/term, back should be detailed answer
4. **Storage**: Saved to `moonscribe-project-{projectId}-flashcards` in localStorage

## 🔍 Debug Tips
- Open browser console to see API calls
- Check Network tab for `/api/study/flashcards` request
- Check localStorage in DevTools
- Verify Pinecone has indexed documents before testing
