# BorrowBuddy mobile app

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

For backend integration, copy `.env.example` to `.env` and set the API URL before
starting Expo. Use the computer's LAN address when testing on a physical Android
device:

```bash
cp .env.example .env
# Set EXPO_PUBLIC_API_URL=http://<computer-lan-ip>:4000/api/v1 in .env
npx expo start -c
```

Expo automatically exposes variables prefixed with `EXPO_PUBLIC_` from `.env` to
Expo Go on Android. The current development value is
Use the laptop's current Wi-Fi/LAN address, for example
`http://192.168.0.106:4000/api/v1`; do not use `localhost` for a physical device.
Find the current address with `ip -4 addr show wlp2s0` before starting Expo.

Authentication tokens are stored with Expo SecureStore. Public browsing, listing
details, listing creation and transaction activity use the backend when the API URL
is reachable. A small local sample-listing fallback remains in the source for
development UI previews.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside `src/app`. This project uses
[file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
