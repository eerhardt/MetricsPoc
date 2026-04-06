import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';

interface Todo {
  id: number;
  title: string;
  isCompleted: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTodos = async () => {
    setError(null);

    try {
      const response = await fetch('/api/todos');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Todo[] = await response.json();
      setTodos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTodos();
  }, []);

  const createTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = newTitle.trim();
    if (!title) {
      setError('Title is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const createdTodo: Todo = await response.json();
      setTodos((currentTodos) => [createdTodo, ...currentTodos]);
      setNewTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo');
    } finally {
      setSubmitting(false);
    }
  };

  const updateTodo = async (
    id: number,
    payload: { title: string; isCompleted: boolean }
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedTodo: Todo = await response.json();
      setTodos((currentTodos) =>
        currentTodos.map((todo) => (todo.id === id ? updatedTodo : todo))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTodo = async (id: number) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id));
      if (editingTodoId === id) {
        setEditingTodoId(null);
        setEditingTitle('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditingTitle(todo.title);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingTodoId(null);
    setEditingTitle('');
  };

  const saveEditing = async (todo: Todo) => {
    const title = editingTitle.trim();
    if (!title) {
      setError('Title is required.');
      return;
    }

    try {
      await updateTodo(todo.id, { title, isCompleted: todo.isCompleted });
      setEditingTodoId(null);
      setEditingTitle('');
    } catch {
      // Error is already surfaced in updateTodo.
    }
  };

  const toggleCompleted = async (todo: Todo) => {
    await updateTodo(todo.id, {
      title: todo.title,
      isCompleted: !todo.isCompleted
    });
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

  const hasTodos = todos.length > 0;

  const renderTodoTitle = (todo: Todo) => {
    if (editingTodoId === todo.id) {
      return (
        <input
          className="todo-title-input"
          type="text"
          value={editingTitle}
          onChange={(event) => setEditingTitle(event.target.value)}
          disabled={submitting}
          maxLength={200}
          autoFocus
        />
      );
    }

    return (
      <span className={`todo-title ${todo.isCompleted ? 'completed' : ''}`}>
        {todo.title}
      </span>
    );
  };

  return (
    <div className="todo-page">
      <main className="todo-card">
        <header className="todo-header">
          <h1>Todos</h1>
          <p>Create, update, and delete tasks stored in PostgreSQL.</p>
        </header>

        <form className="todo-create-form" onSubmit={createTodo}>
          <label htmlFor="new-todo-title">New todo</label>
          <div className="todo-create-row">
            <input
              id="new-todo-title"
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="What needs to be done?"
              maxLength={200}
              disabled={submitting}
            />
            <button type="submit" disabled={submitting}>
              Add
            </button>
          </div>
        </form>

        {error && (
          <p className="todo-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="todo-state" role="status">
            Loading todos...
          </p>
        ) : !hasTodos ? (
          <p className="todo-state">No todos yet. Add your first task above.</p>
        ) : (
          <ul className="todo-list">
            {todos.map((todo) => (
              <li key={todo.id} className="todo-item">
                <div className="todo-main">
                  <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={() => void toggleCompleted(todo)}
                    disabled={submitting}
                    aria-label={`Mark "${todo.title}" as ${todo.isCompleted ? 'not completed' : 'completed'}`}
                  />

                  <div className="todo-text">
                    {renderTodoTitle(todo)}
                    <span className="todo-meta">
                      Updated {formatDateTime(todo.updatedAtUtc)}
                    </span>
                  </div>
                </div>

                <div className="todo-actions">
                  {editingTodoId === todo.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void saveEditing(todo)}
                        disabled={submitting}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(todo)}
                      disabled={submitting}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void deleteTodo(todo.id)}
                    disabled={submitting}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default App;
