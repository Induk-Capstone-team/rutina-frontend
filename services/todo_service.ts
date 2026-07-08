// services/todo_service.ts
import { api } from "@/lib/data/api";
import type {
  CreateTodoRequest,
  Todo,
  UpdateTodoCompletedRequest,
  UpdateTodoRequest,
} from "@/types/todo";

export const TodoService = {
  // POST /todos
  create: (data: CreateTodoRequest): Promise<Todo> =>
    api("/todos", { method: "POST", body: JSON.stringify(data) }),

  // GET /todos?date=
  getByDate: (date: string): Promise<Todo[]> => api(`/todos?date=${date}`),

  // GET /todos/month?year=&month=
  getByMonth: (year: number, month: number): Promise<Todo[]> =>
    api(`/todos/month?year=${year}&month=${month}`),
  // GET /todos/today
  getToday: (): Promise<Todo[]> => api("/todos/today"),

  // PUT /todos/{todoId}
  update: (id: number, data: UpdateTodoRequest): Promise<Todo> =>
    api(`/todos/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // PATCH /todos/{todoId}/completed
  updateCompleted: (
    id: number,
    data: UpdateTodoCompletedRequest,
  ): Promise<Todo> =>
    api(`/todos/${id}/completed`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // DELETE /todos/{todoId}
  delete: (id: number): Promise<string> =>
    api(`/todos/${id}`, { method: "DELETE" }),
};
