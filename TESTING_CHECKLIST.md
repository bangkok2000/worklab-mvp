# MoonScribe - Testing Checklist

## 🚀 Quick Start

1. **Open the app:** http://localhost:3000
2. **Check the UI:** You should see the three-panel layout

---

## ✅ UI Improvements Testing

### **1. Three-Panel Layout**

#### Left Panel - Sources
- [ ] **Panel visibility:** Left panel shows "📚 Sources" header
- [ ] **Search bar:** Search input is visible and functional
- [ ] **Upload button:** "+ Add Document" button is visible
- [ ] **Collapse button:** Click ◀ to collapse/expand panel
- [ ] **Empty state:** Shows "No documents uploaded yet" when empty

#### Center Panel - Chat
- [ ] **Chat header:** Shows "💬 Chat" with "New Chat" button
- [ ] **Empty state:** Shows "Start a conversation" message
- [ ] **Input area:** Text area and Send button visible
- [ ] **Message display:** Messages appear in chat bubbles

#### Right Panel - History
- [ ] **History header:** Shows "📜 History" header
- [ ] **Collapse button:** Click ▶ to collapse/expand panel
- [ ] **Empty state:** Shows "No conversations yet" when empty
- [ ] **Conversation list:** Past conversations appear here

---

### **2. Document Upload**

#### Basic Upload
- [ ] **File selection:** Click "+ Add Document" opens file picker
- [ ] **Multiple files:** Can select multiple PDF files
- [ ] **File display:** Selected files show count
- [ ] **Upload button:** "Upload & Process" button appears
- [ ] **Processing state:** Button shows "Processing..." during upload
- [ ] **Success message:** Green success message appears after upload
- [ ] **Document list:** Uploaded files appear in left panel

#### Document Display
- [ ] **Document cards:** Each document shows as a card
- [ ] **Filename:** Document name is visible
- [ ] **Status:** Shows "Ready" status
- [ ] **Delete button:** Trash icon (🗑️) is visible and clickable
- [ ] **Delete confirmation:** Confirmation dialog appears
- [ ] **Delete success:** Document disappears after deletion

#### Search Functionality
- [ ] **Search input:** Type in search box
- [ ] **Filter works:** Documents filter as you type
- [ ] **Empty search:** Shows "No documents match your search"
- [ ] **Clear search:** Clearing search shows all documents

---

### **3. Chat Functionality**

#### Asking Questions
- [ ] **Input enabled:** Can type in text area
- [ ] **Send button:** Button enables when text is entered
- [ ] **Enter to send:** Press Enter to send (Shift+Enter for new line)
- [ ] **Loading state:** Shows "Thinking..." with spinner
- [ ] **User message:** Your question appears in blue bubble
- [ ] **AI response:** Answer appears in gray bubble
- [ ] **Timestamps:** Time appears below each message

#### Citations
- [ ] **Sources section:** Sources appear below AI response
- [ ] **Source count:** Shows number of sources
- [ ] **Clickable:** Citations are clickable (underlined)
- [ ] **Click action:** Clicking citation scrolls to document
- [ ] **Highlight:** Document briefly highlights when clicked
- [ ] **Relevance:** Shows relevance percentage

#### Conversation History
- [ ] **Auto-save:** Conversations save automatically
- [ ] **History panel:** Conversations appear in right panel
- [ ] **Click to load:** Clicking conversation loads messages
- [ ] **Active highlight:** Current conversation is highlighted
- [ ] **Delete conversation:** × button deletes conversation
- [ ] **New chat:** "+ New Chat" button clears current conversation

---

### **4. UI/UX Details**

#### Loading States
- [ ] **Upload loading:** Button disabled during upload
- [ ] **Ask loading:** "Thinking..." with spinner animation
- [ ] **Delete loading:** Trash icon changes to ⏳ during delete

#### Status Messages
- [ ] **Success messages:** Green status messages appear
- [ ] **Error messages:** Red error messages appear
- [ ] **Auto-dismiss:** Messages disappear after a few seconds

#### Responsive Behavior
- [ ] **Panel collapse:** Panels can be collapsed/expanded
- [ ] **Window resize:** Layout adapts (basic responsiveness)

---

## 🐛 Known Issues to Check

### **Potential Issues:**
1. **Conversation persistence:** Uses localStorage (temporary)
2. **No auth yet:** Data won't persist across devices
3. **Mobile view:** May need responsive improvements
4. **Large files:** Very large PDFs might take time

---

## 📋 Test Scenarios

### **Scenario 1: First-Time User**
1. Open app → See empty state
2. Upload a PDF → See it in left panel
3. Ask a question → Get answer with citations
4. Check history → See conversation saved

### **Scenario 2: Multiple Documents**
1. Upload 3 different PDFs
2. Search for one → Filter works
3. Ask question → Should search all 3
4. Click citation → Scrolls to correct document

### **Scenario 3: Conversation Management**
1. Ask multiple questions → Creates conversation
2. Start new chat → Clears current
3. Load old conversation → Messages appear
4. Delete conversation → Removes from history

### **Scenario 4: Document Management**
1. Upload document → Appears in list
2. Search for it → Filter works
3. Delete it → Removed from list
4. Ask question → Should not find it

---

## 🔍 What to Look For

### **Visual Checks:**
- ✅ Clean three-panel layout
- ✅ Proper spacing and alignment
- ✅ Color coding (blue for user, gray for AI)
- ✅ Icons and emojis display correctly
- ✅ Status messages are visible

### **Functional Checks:**
- ✅ All buttons work
- ✅ Forms submit correctly
- ✅ Search filters properly
- ✅ Citations are clickable
- ✅ History saves/loads

### **Performance Checks:**
- ✅ Fast response times
- ✅ Smooth animations
- ✅ No lag when typing
- ✅ Quick document upload

---

## 🚨 If Something Doesn't Work

### **Check Browser Console:**
1. Open DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests

### **Common Issues:**
- **Upload fails:** Check API route is working
- **No answer:** Check OpenAI API key
- **Citations don't work:** Check JavaScript errors
- **History doesn't save:** Check localStorage permissions

---

## 📝 Test Results Template

```
Date: ___________
Tester: ___________

UI Layout: [ ] Pass [ ] Fail
Document Upload: [ ] Pass [ ] Fail
Chat Functionality: [ ] Pass [ ] Fail
Citations: [ ] Pass [ ] Fail
History: [ ] Pass [ ] Fail

Issues Found:
1. 
2. 
3. 

Notes:
```

---

## 🎯 Next Steps After Testing

1. **Report any bugs** you find
2. **Note UI improvements** needed
3. **Suggest features** you'd like to see
4. **Test on different browsers** (Chrome, Firefox, Safari)

---

*Happy Testing! 🚀*

