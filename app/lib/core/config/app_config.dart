class AppConfig {
  static const projectId = String.fromEnvironment("PROJECT_ID");
  static const apiUrl = String.fromEnvironment("API_URL");
  static const useMockApi = bool.fromEnvironment("USE_MOCK_API");
}
