import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import Colors from "@/constants/colors";
import { useNotes } from "@/context/NotesContext";

const C = Colors.light;

export default function EditorScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { notes, createNote, updateNote, deleteNote } = useNotes();

  const noteId = id ? parseInt(id, 10) : null;
  const existing = noteId ? notes.find((n) => n.id === noteId) : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [saving, setSaving] = useState(false);

  const contentRef = useRef<TextInput>(null);
  const createdIdRef = useRef<number | null>(noteId);
  const latestTitle = useRef(title);
  const latestContent = useRef(content);

  const handleTitleChange = (t: string) => {
    setTitle(t);
    latestTitle.current = t;
  };

  const handleContentChange = (c: string) => {
    setContent(c);
    latestContent.current = c;
  };

  const doSave = useCallback(async () => {
    const t = latestTitle.current.trim();
    const c = latestContent.current;
    if (!t && !c.trim()) return;
    setSaving(true);
    try {
      if (createdIdRef.current) {
        await updateNote(createdIdRef.current, t || "Untitled", c);
      } else {
        const note = await createNote(t || "Untitled", c);
        createdIdRef.current = note.id;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }, [createNote, updateNote]);

  const handleBack = useCallback(() => {
    const t = latestTitle.current.trim();
    const c = latestContent.current.trim();
    const isNew = !createdIdRef.current;
    const isDirty =
      isNew
        ? t.length > 0 || c.length > 0
        : t !== (existing?.title ?? "") || c !== (existing?.content ?? "");

    if (isDirty) {
      Alert.alert("Unsaved Changes", "Save your note before leaving?", [
        { text: "Discard", style: "destructive", onPress: () => router.back() },
        { text: "Save & Go Back", onPress: doSave },
      ]);
    } else {
      router.back();
    }
  }, [doSave, existing]);

  const handleDelete = useCallback(() => {
    if (!createdIdRef.current) {
      router.back();
      return;
    }
    Alert.alert("Delete Note", "This note will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (createdIdRef.current) {
            await deleteNote(createdIdRef.current);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          router.back();
        },
      },
    ]);
  }, [deleteNote]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const canSave = (title.trim().length > 0 || content.trim().length > 0) && !saving;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={handleBack}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color={C.text} />
          <Text style={styles.backText}>Notes</Text>
        </Pressable>

        {(!!noteId || !!createdIdRef.current) && (
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
            onPress={handleDelete}
            hitSlop={8}
          >
            <Feather name="trash-2" size={18} color={C.danger} />
          </Pressable>
        )}
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={80}
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor={C.textTertiary}
          value={title}
          onChangeText={handleTitleChange}
          returnKeyType="next"
          onSubmitEditing={() => contentRef.current?.focus()}
          multiline={false}
          maxLength={200}
        />

        <View style={styles.divider} />

        <TextInput
          ref={contentRef}
          style={styles.contentInput}
          placeholder="Start writing..."
          placeholderTextColor={C.textTertiary}
          value={content}
          onChangeText={handleContentChange}
          multiline
          textAlignVertical="top"
          autoFocus={!existing}
        />

        <Text style={styles.statsText}>
          {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount}{" "}
          {charCount === 1 ? "char" : "chars"}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            !canSave && styles.saveBtnDisabled,
            pressed && canSave && styles.saveBtnPressed,
          ]}
          onPress={doSave}
          disabled={!canSave}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Note</Text>
            </>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: C.dangerSubtle,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexGrow: 1,
  },
  titleInput: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.3,
    paddingVertical: 4,
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },
  contentInput: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: C.text,
    lineHeight: 26,
    padding: 0,
    minHeight: 260,
  },
  statsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textTertiary,
    marginTop: 16,
    marginBottom: 24,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.tintDeep,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: C.tintDeep,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.35,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
