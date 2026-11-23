
export async function login(req, res) {
  try {
    const { email, password, role } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      password.length > 128 ||
      !["admin", "student"].includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email, password, and role.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    console.log("AUTH DEBUG:", {
      database: User.db.name,
      collection: User.collection.name,
      userFound: !!user,
      databaseRole: user?.role,
      isActive: user?.isActive,
      passwordSelected: !!user?.password,
    });

    if (!user || !user.isActive || user.role !== role) {
      console.log("LOGIN FAILED: User, status, or role check failed");

      return res.status(401).json({
        success: false,
        message: "Invalid email, password, or account type.",
      });
    }

    const passwordMatches = await user.comparePassword(password);

    console.log("PASSWORD DEBUG:", {
      passwordMatches,
      passwordType: typeof password,
      passwordLength: password.length,
      hashLength: user.password.length,
    });

    if (!passwordMatches) {
      console.log("LOGIN FAILED: Password mismatch");

      return res.status(401).json({
        success: false,
        message: "Invalid email, password, or account type.",
      });
    }

    const token = createToken(user._id.toString());

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Login successful.",
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in right now.",
    });
  }
}
