import { TodoService } from "@/services/todo_service";
import { useState } from "react";
import { Alert } from "react-native";

const CONTENT_MAX_LENGTH = 30;

export function useTodoForm(onSuccess: () => void) {
  const [content, setContent] = useState("");
  const [todoDate, setTodoDate] = useState(() => {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  });
  const [isTimed, setIsTimed] = useState(false);
  const [todoHour, setTodoHour] = useState("09");
  const [todoMinute, setTodoMinute] = useState("00");

  const handleSave = async () => {
    const trimmed = content.trim();

    if (!trimmed) {
      Alert.alert("내용 입력 필요", "내용을 입력해 주세요.");
      return;
    }

    if (trimmed.length > CONTENT_MAX_LENGTH) {
      Alert.alert(
        "글자 수 초과",
        `할 일 내용은 ${CONTENT_MAX_LENGTH}자까지 입력할 수 있어요.`,
      );
      return;
    }

    await TodoService.create({
      todoDate,
      todoTime: isTimed ? `${todoHour}:${todoMinute}` : null,
      content: trimmed,
    });

    onSuccess();
  };

  return {
    content,
    setContent,
    todoDate,
    setTodoDate,
    isTimed,
    setIsTimed,
    todoHour,
    setTodoHour,
    todoMinute,
    setTodoMinute,
    handleSave,
  };
}
