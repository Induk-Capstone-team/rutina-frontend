// types/todo.ts
export interface Todo {
  id: number;
  todoDate: string; // "2026-07-07"
  todoTime?: string | null;
  content: string;
  completed: boolean;
}

export interface CreateTodoRequest {
  todoDate: string;
  todoTime?: string | null;
  content: string;
}

export interface UpdateTodoRequest {
  todoDate: string;
  todoTime?: string | null;
  content: string;
}

export interface UpdateTodoCompletedRequest {
  completed: boolean;
}
