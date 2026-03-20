import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [saved, setSaved] = useState(!!existing);
  const [hasChanges, setHasChanges] = useState(false);

  const contentRef = useRef<TextInput>(null);
  const createdIdRef = useRef<number | null>(noteId);
  const latestTitle = useRef(title);
  const latestContent = useRef(content);

  useEffect(() => { latestTitle.current = title; }, [title]);
  useEffect(() => { latestContent.current = content; }, [content]);

  const doSave = useCallback(async (t: string, c: string): Promise<boolean> => {
    if (!t.trim() && !c.trim()) return false;
    setSaving(true);
    setSaved(false);
    try {
      if (createdIdRef.current) {
        await updateNote(createdIdRef.current, t || "Untitled", c);
      } else {
        const note = await createNote(t || "Untitled", c);
        createdIdRef.current = note.id;
      }
      setSaved(true);
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [createNote, updateNote]);

  const handleSave = useCallback(async () => {
    await doSave(latestTitle.current, latestContent.current);
  }, [doSave]);

  const handleBack = useCallback(async () => {
    if (hasChanges && (latestTitle.current.trim() || latestContent.current.trim())) {
      Alert.alert("Unsaved Changes", "Do you want to save before leaving?", [
        {
          text: "Discard",
          style: "destructive",
          onPress: () => router.back(),
        },
        {
          text: "Save",
          onPress: async () => {
            await doSave(latestTitle.current, latestContent.current);
            router.back();
          },
        },
      ]);
    } else {
      router.back();
    }
  }, [doSave, hasChanges]);

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

  const handleTitleChange = (t: string) => {
    setTitle(t);
    setSaved(false);
    setHasChanges(true);
  };

  const handleContentChange = (c: string) => {
    setContent(c);
    setSaved(false);
    setHasChanges(true);
  };

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

        <View style={styles.topRight}>
          {(noteId || createdIdRef.current) ? (
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
              onPress={handleDelete}
              hitSlop={8}
            >
              <Feather name="trash-2" size={18} color={C.danger} />
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              !canSave && styles.saveBtnDisabled,
              pressed && canSave && { opacity: 0.85 },
            ]}
            onPress={handleSave}
            disabled={!canSave}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : saved && !hasChanges ? (
              <>
                <Feather name="check" size={14} color="#fff" />
                <Text style={styles.saveBtnText}>Saved</Text>
              </>
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 60 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
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
      </KeyboardAwareScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.statsText}>
          {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount}{" "}
          {charCount === 1 ? "char" : "chars"}
        </Text>
      </View>
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
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: C.dangerSubtle,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.tintDeep,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 72,
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    flexGrow: 1,
  },
  titleInput: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.3,
    marginBottom: 12,
    padding: 0,
  },
  contentInput: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: C.text,
    lineHeight: 26,
    padding: 0,
    minHeight: 300,
  },
  bottomBar: {
    paddingTop: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  statsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textTertiary,
    textAlign: "center",
  },
});
