import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Switch } from 'react-native';

type SettingItemProps = {
  icon: string;
  title: string;
  value?: string | boolean;
  type?: 'link' | 'switch' | 'text';
  onToggle?: (val: boolean) => void;
};

const SettingItem = ({ icon, title, value, type = 'link', onToggle = () => {} }: SettingItemProps) => {
  return (
    <TouchableOpacity style={styles.settingItem} activeOpacity={type === 'link' ? 0.7 : 1}>
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      
      <View style={styles.settingItemRight}>
        {type === 'link' && (
          <>
            {value && <Text style={styles.settingValue}>{value}</Text>}
            <Text style={styles.chevron}>›</Text>
          </>
        )}
        {type === 'switch' && (
          <Switch 
            value={!!value} 
            onValueChange={onToggle}
            trackColor={{ false: '#E2E5EC', true: '#405886' }}
            thumbColor={'#FFFFFF'}
          />
        )}
        {type === 'text' && (
          <Text style={styles.settingValue}>{value}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Text style={styles.profileImageText}>나</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>홍길동</Text>
            <Text style={styles.profileEmail}>gildong@rutia.app</Text>
          </View>
          <TouchableOpacity style={styles.editProfileBtn}>
            <Text style={styles.editProfileText}>수정</Text>
          </TouchableOpacity>
        </View>

        {/* General Settings */}
        <Text style={styles.sectionTitle}>일반</Text>
        <View style={styles.card}>
          <SettingItem 
            icon="🔔" 
            title="알림 설정" 
            type="switch" 
            value={notifications}
            onToggle={setNotifications}
          />
          <View style={styles.divider} />
          <SettingItem 
            icon="🌙" 
            title="다크 모드" 
            type="switch" 
            value={darkMode}
            onToggle={setDarkMode}
          />
          <View style={styles.divider} />
          <SettingItem 
            icon="⏱" 
            title="시간 형식" 
            value="24시간" 
          />
        </View>

        {/* Routine Settings */}
        <Text style={styles.sectionTitle}>루틴 관리</Text>
        <View style={styles.card}>
          <SettingItem 
            icon="🎨" 
            title="루틴 색상 테마" 
            value="기본" 
          />
          <View style={styles.divider} />
          <SettingItem 
            icon="📦" 
            title="카테고리 편집" 
          />
        </View>

        {/* Support & Info empty */}
        <Text style={styles.sectionTitle}>지원 및 정보</Text>
        <View style={styles.card}>
          <SettingItem 
            icon="💬" 
            title="공지사항" 
          />
          <View style={styles.divider} />
          <SettingItem 
            icon="❓" 
            title="고객센터 / 도움말" 
          />
          <View style={styles.divider} />
          <SettingItem 
            icon="ℹ️" 
            title="앱 버전" 
            type="text"
            value="1.0.0"
          />
        </View>

        {/* Account Actions */}
        <View style={styles.accountActionsRow}>
          <TouchableOpacity style={styles.logoutButton}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2A3C6B',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    marginTop: 10,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#405886',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A3C6B',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#8A8C9A',
  },
  editProfileBtn: {
    backgroundColor: '#F3F4F8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  editProfileText: {
    color: '#405886',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8A8C9A',
    marginLeft: 12,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#F8F9FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 15,
    color: '#8A8C9A',
    marginRight: 8,
  },
  chevron: {
    fontSize: 20,
    color: '#C4C6D0',
    fontWeight: '400',
    marginTop: -2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F8',
    marginLeft: 64, // Align with text start
    marginRight: 20,
  },
  accountActionsRow: {
    marginTop: 8,
    paddingHorizontal: 12,
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutText: {
    color: '#E79A95',
    fontSize: 16,
    fontWeight: '600',
  },
});
