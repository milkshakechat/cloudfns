import { checkIfUsernameAvailable } from "../services/firestore";
import { Username, checkIfUsernameIsAllowed } from "@milkshakechat/helpers";

function generateRandom7DigitNumber(): number {
  const min = 1000000; // Smallest 7 digit number
  const max = 9999999; // Largest 7 digit number
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const generatePlaceholderNames = () => {
  const suffix = generateRandom7DigitNumber();
  return {
    username: `user${suffix}` as Username,
    displayName: `User ${suffix}`,
  };
};

export async function generateAvailablePlaceholderNames() {
  let isAvailable = false;
  let username: Username = "" as Username;
  let displayName = "";

  while (!isAvailable) {
    ({ username, displayName } = generatePlaceholderNames());

    const notTaken = await checkIfUsernameAvailable(username);
    const allowed = checkIfUsernameIsAllowed(username);
    if (notTaken && allowed) {
      isAvailable = true;
    }
  }

  return { username, displayName };
}
