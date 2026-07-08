// components/todo_form.tsx
import { makeStyles } from "@/components/routine_form";
import SingleTimePickerModal from "@/components/single_time_picker_modal";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTodoForm } from "@/hooks/use_todo_form";
import { useTheme } from "@/lib/constants/ThemeContext";
import React, { useState } from "react";
import { Switch, TextInput, TouchableOpacity, View } from "react-native";

export type TodoFormHandle = {
  saveDraft: () => Promise<void>;
};

interface TodoFormProps {
  onSuccess: () => void;
}

function TodoFormBase(
  { onSuccess }: TodoFormProps,
  ref: React.Ref<TodoFormHandle>,
) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const {
    content,
    setContent,
    isTimed,
    setIsTimed,
    todoHour,
    setTodoHour,
    todoMinute,
    setTodoMinute,
    handleSave,
  } = useTodoForm(onSuccess);

  const [showTimeModal, setShowTimeModal] = useState(false);

  React.useImperativeHandle(ref, () => ({
    // Todo는 draft 저장 기능이 아직 없음.
    saveDraft: async () => {},
  }));

  const handleApplyTime = (time: { hour: string; minute: string }) => {
    setTodoHour(time.hour);
    setTodoMinute(time.minute);
    setShowTimeModal(false);
  };

  return (
    <>
      <TextInput
        style={styles.mainInput}
        placeholder="무엇을 할까요?"
        value={content}
        onChangeText={setContent}
        maxLength={30}
        placeholderTextColor="#B4B6C0"
      />

      <View style={styles.optionCard}>
        <View style={styles.rowBetween}>
          <View style={styles.iconLabel}>
            <IconSymbol name="clock.fill" size={18} color={theme.main} />
            <ThemedText style={styles.optionLabel}>시간 설정</ThemedText>
          </View>

          <Switch
            value={isTimed}
            onValueChange={setIsTimed}
            trackColor={{ true: "#9FA2D6" }}
          />
        </View>

        {isTimed && (
          <View style={styles.timeSettingArea}>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setShowTimeModal(true)}
            >
              <View style={styles.selectorLeft}>
                <IconSymbol name="clock" size={18} color={theme.main} />
                <ThemedText style={styles.selectorText}>
                  {todoHour}:{todoMinute}
                </ThemedText>
              </View>

              <IconSymbol
                name="chevron.right"
                size={16}
                color={theme.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <ThemedText style={styles.saveButtonText}>할 일 등록하기</ThemedText>
      </TouchableOpacity>

      <SingleTimePickerModal
        visible={showTimeModal}
        hour={todoHour}
        minute={todoMinute}
        onClose={() => setShowTimeModal(false)}
        onApply={handleApplyTime}
      />
    </>
  );
}

const TodoForm = React.forwardRef(TodoFormBase);

export default TodoForm;
