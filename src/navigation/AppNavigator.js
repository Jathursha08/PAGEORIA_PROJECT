import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import BookshelfScreen from '../screens/BookshelfScreen';
import JournalScreen from '../screens/JournalScreen';
import WishlistChallengesScreen from '../screens/WishlistChallengesScreen';
import StatisticsProfileScreen from '../screens/StatisticsProfileScreen';
import AddEditBookScreen from '../screens/AddEditBookScreen';
import BookDetailsScreen from '../screens/BookDetailsScreen';
import ReadingTrackerScreen from '../screens/ReadingTrackerScreen';
import QuotesReviewsScreen from '../screens/QuotesReviewsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { t } from '../i18n';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const makeNavTheme = () => ({
  ...DefaultTheme,
  dark: colors.isDark,
  colors: { ...DefaultTheme.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary },
});

const TAB_ICONS = {
  Home: ['home-variant-outline', 'home-variant'],
  Bookshelf: ['bookshelf', 'bookshelf'],
  Journal: ['notebook-edit-outline', 'notebook-edit'],
  Wishlist: ['bookmark-multiple-outline', 'bookmark-multiple'],
  Profile: ['account-circle-outline', 'account-circle'],
};

function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
        tabBarLabelStyle: { fontFamily: fonts.sansSemi, fontSize: 11 },
        tabBarIcon: ({ focused, color }) => (
          <MaterialCommunityIcons name={TAB_ICONS[route.name][focused ? 1 : 0]} size={25} color={color} />
        ),
        sceneStyle: { backgroundColor: colors.background },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('Home') }} />
      <Tab.Screen name="Bookshelf" component={BookshelfScreen} options={{ tabBarLabel: t('Bookshelf') }} />
      <Tab.Screen name="Journal" component={JournalScreen} options={{ tabBarLabel: t('Journal') }} />
      <Tab.Screen name="Wishlist" component={WishlistChallengesScreen} options={{ tabBarLabel: t('Wishlist') }} />
      <Tab.Screen name="Profile" component={StatisticsProfileScreen} options={{ tabBarLabel: t('Profile') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ initialState, onStateChange }) {
  return (
    <NavigationContainer theme={makeNavTheme()} initialState={initialState} onStateChange={onStateChange}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="BookDetails" component={BookDetailsScreen} />
        <Stack.Screen name="AddEditBook" component={AddEditBookScreen} />
        <Stack.Screen name="ReadingTracker" component={ReadingTrackerScreen} />
        <Stack.Screen name="QuotesReviews" component={QuotesReviewsScreen} />
        <Stack.Screen name="Challenges" component={WishlistChallengesScreen} />
        <Stack.Screen name="Statistics" component={StatisticsProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
