const API = '/todos';
const list = document.getElementById('todoList');
const form = document.getElementById('todoForm');
const input = document.getElementById('todoInput');

async function fetchTodos() {
  const res = await fetch(API);
  const todos = await res.json();
  render(todos);
}

function render(todos) {
  if (todos.length === 0) {
    list.innerHTML = '<div class="empty">No todos yet</div>';
    return;
  }
  list.innerHTML = todos.map(t => `
    <div class="todo ${t.completed ? 'completed' : ''}" data-id="${t.id}">
      <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggle(${t.id}, ${!t.completed})" />
      <span class="title">${esc(t.title)}</span>
      <button class="delete" onclick="remove(${t.id})">&times;</button>
    </div>
  `).join('');
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  input.value = '';
  fetchTodos();
});

async function toggle(id, completed) {
  await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed })
  });
  fetchTodos();
}

async function remove(id) {
  await fetch(`${API}/${id}`, { method: 'DELETE' });
  fetchTodos();
}

fetchTodos();
