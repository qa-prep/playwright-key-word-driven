# location: tests_keyword_driven/projects/demo/features/30-registrationViaCurl.feature
# ./run-tests.sh project=demo headed=true speed=slow debug-mode=all tags=@demoRegister30
# ./run-tests.sh project=demo @tags=demoRegister30
# ./run-tests.sh env=demo

@demoRegister30 
Feature: User registration
  As a new user
  I want to register an account
  So that I can access the application and use its features


  Scenario: A new user successfully registers for an account

    # Instead of doing all of these stesp, we can curl the api end point direcrly

    # When I go to "http://localhost:8082/auth?mode=register"
    # And I set field "Username" to "myNameIsBob"
    # And I set field "Email" to "testprefix_bobsemail@example.com"
    # And I set field "Password" to "bobsInsecurePassword"
    # And I click "Yes"
    # And I click "I confirm I am over 18"
    # And I click "I agree to the"
    # And I click any "Accept all cookies"
    # And I click "role:button:Register"
    # Then I should see viewport text "Welcome"


    Given I set variable "username" to "anotherBob2"
    And I set variable "email" to "testprefix_anotherBob2@example.com"
    And I set variable "password" to "4ThisIsntVerySecure!"
    When I curl template "auth/register" into variable "curlResponse"
    And I spit "+var(curlResponse)"
    Then I should not see variable "curlResponse" contains "error"



    