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
  const [saved, setSaved] = useState(false);

  const contentRef = useRef<TextInput>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createdIdRef = useRef<number | null>(noteId);
  const latestTitle = useRef(title);
  const latestContent = useRef(content);

  useEffect(() => { latestTitle.current = title; }, [title]);
  useEffect(() => { latestContent.current = content; }, [content]);

  const doSave = useCallback(async (t: string, c: string) => {
    if (!t.trim() && !c.trim()) return;
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
    } catch {
      // Silent fail on auto-save; user can try again
    } finally {
      setSaving(false);
    }
  }, [createNote, updateNote]);

  const scheduleSave = useCallback((t: string, c: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaved(false);
    saveTimeoutRef.current = setTimeout(() => {
      doSave(t, c);
    }, 800);
  }, [doSave]);

  const handleBack = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const t = latestTitle.current;
    const c = latestContent.current;
    if (t.trim() || c.trim()) {
      await doSave(t, c);
    }
    router.back();
  }, [doSave]);

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
    scheduleSave(t, latestContent.current);
  };

  const handleContentChange = (c: string) => {
    setContent(c);
    scheduleSave(latestTitle.current, c);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          onPress={handleBack}
        >
          <Feather name="chevron-down" size={24} color={C.text} />
        </Pressable>

        <View style={styles.statusRow}>
          {saving ? (
            <ActivityIndicator size="small" color={C.textTertiary} />
          ) : saved ? (
            <View style={styles.savedBadge}>
              <Feather name="check" size={12} color={C.tintDeep} />
              <Text style={styles.savedText}>Saved</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          onPress={handleDelete}
        >
          <Feather name="trash-2" size={20} color={C.danger} />
        </Pressable>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  statusRow: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 28,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.tintSubtle,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savedText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: C.tintDeep,
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
