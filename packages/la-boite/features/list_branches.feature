Feature: List branches

  @wip
  Scenario: One branch
    Given a GitHub repo "cucumber/shouty" with branches:
      | master |
    And a user Bob has valid credentials for the repo
    When Bob connects CucumberStudio to the repo
    Then Bob can see that the repo's branches are:
      | master |