# location: tests_keyword_driven/projects/demo/features/registration.feature
# ./run-tests.sh project=demo headed=true speed=slow debug-mode=all tags=@demoRegister1
# ./run-tests.sh project=demo tags=@demoRegister1
# ./run-tests.sh env=demo

@demoRegister1 
Feature: User registration
  As a new user
  I want to register an account
  So that I can access the application and use its features


  Scenario: A new user successfully registers for an account


    # see registration.feature.explain for re-runs


    When I go to "http://localhost:8082/auth?mode=register"
    And I set field "Username" to "myNameIsBob"
    And I set field "Email" to "bobsemail@example.com"
    And I set field "Password" to "bobsInsecurePassword"
    And I click "Yes"
    And I click "I confirm I am over 18"
    And I click "I agree to the"
    And I click any "Accept all cookies"
    And I click "role:button:Register"
    Then I should see viewport text "Welcome"


  