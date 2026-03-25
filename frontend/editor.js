// editor.js — sets up CodeMirror and the default starter code

const STARTER_CODE = `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> nums = {5, 2, 8, 1, 9, 3};

    std::sort(nums.begin(), nums.end());

    std::cout << "Sorted: ";
    for (int n : nums) std::cout << n << " ";
    std::cout << std::endl;

    std::cout << "Enter your name: ";
    std::string name;
    std::cin >> name;
    std::cout << "Hello, " << name << "!" << std::endl;

    return 0;
}
`;

// Init CodeMirror
window.editor = CodeMirror.fromTextArea(
  document.getElementById('code-editor'),
  {
    mode:           'text/x-c++src',
    theme:          'dracula',
    lineNumbers:    true,
    matchBrackets:  true,
    autoCloseBrackets: true,
    indentUnit:     4,
    tabSize:        4,
    indentWithTabs: false,
    lineWrapping:   false,
    autofocus:      true,
    extraKeys: {
      'Ctrl-Enter': () => document.getElementById('run-btn').click(),
      'Cmd-Enter':  () => document.getElementById('run-btn').click(),
      'Ctrl-/':     (cm) => cm.execCommand('toggleComment'),
    }
  }
);

// Make editor fill remaining height
function resizeEditor() {
  const leftPanel   = document.querySelector('.left-panel');
  const stdinHeight = document.querySelector('.stdin-section').offsetHeight;
  const labelHeight = document.querySelector('.left-panel .panel-label').offsetHeight;
  const available   = leftPanel.clientHeight - stdinHeight - labelHeight;
  window.editor.setSize(null, Math.max(available, 200) + 'px');
}
window.addEventListener('resize', resizeEditor);
window.addEventListener('load',   resizeEditor);

// Load starter code
window.editor.setValue(STARTER_CODE);

// ── Tab switching ───────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.output-pane').forEach(p => {
      p.classList.remove('active');
      p.classList.add('hidden');
    });
    btn.classList.add('active');
    const target = document.getElementById('tab-' + btn.dataset.tab);
    target.classList.remove('hidden');
    target.classList.add('active');
  });
});

// ── Clear button ────────────────────────────────────────
document.getElementById('clear-btn').addEventListener('click', () => {
  window.editor.setValue('');
  document.getElementById('console-output').innerHTML =
    '<span class="placeholder">Output will appear here after you click Run...</span>';
  document.getElementById('error-output').innerHTML =
    '<span class="placeholder">No errors yet.</span>';
  document.getElementById('status-text').textContent = 'Ready';
  document.getElementById('compile-time').textContent = '';
  window.editor.focus();
});
