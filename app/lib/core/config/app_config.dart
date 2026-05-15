class AppConfig {
  static const projectId = "bb3cb1e65445688c66d9450522595b30";
  static const apiUrl = String.fromEnvironment("API_URL", defaultValue: "http://localhost");
  static const useMockApi = bool.fromEnvironment("USE_MOCK_API", defaultValue: true);
}
