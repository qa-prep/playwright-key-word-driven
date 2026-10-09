# location: tests_keyword_driven/projects/demo/pretest1/pretest1a-build-test-users.feature
# ./run-tests.sh env=demo tags=@pre-test-1 debug-mode=all headed=true speed=slow
# ./run-tests.sh env=demo tags=@pre-test-1
# ./run-tests.sh env=demo


@setup-tests @pre-test-1
Feature: Create test users

  @scenarioName.auto-generate-users
  Scenario: Clear exist test users and recreate them

    # NOTE: These methods delete and create users by looping the curls of real endpoints, 
    # when you want to get serious about bulk creating and deleting
    # You will want a custom end point to bulk create and delete users that is just for automation (not on live)

    When I set variable "allEmailPrefix" to "auto-gen-user"
    And I set variable "allNamePrefix" to "AutoGenUser"

    Given I curl delete user data for email contains "+var(allEmailPrefix)"

    # NOTE: change the table name so your users table: (it wont ds_core_users)

    And I db count "ds_core_users" rows where column "email" like "+var(allEmailPrefix)" into variable "userCount"
    Then I should see variable "userCount" is "0"

    # NOTE: check the curlRegisterUsers inside file: 
    # tests_keyword_driven/projects/demo/steps/curl-register-user.steps.ts (it just loops auth/register, make sure that is correct)


    # lets create some users for registration testing
    When I set variable "namePrefix" to "team+var(allNamePrefix)"
    When I set variable "emailPrefix" to "team+var(allEmailPrefix)"
    When I curl register "5" users using name prefix "+var(namePrefix)" email prefix "+var(emailPrefix)"
    And I db count "ds_core_users" rows where column "email" like "+var(allEmailPrefix)" into variable "userCount"
    Then I should see variable "userCount" is "5"

    # lets create some users for other areas testing
    When I set variable "namePrefix" to "otherareas+var(allNamePrefix)"
    When I set variable "emailPrefix" to "otherareas+var(allEmailPrefix)"
    When I curl register "10" users using name prefix "+var(namePrefix)" email prefix "+var(emailPrefix)"
    And I db count "ds_core_users" rows where column "email" like "+var(allEmailPrefix)" into variable "userCount"
    Then I should see variable "userCount" is "15"


    # This will create 15 users
    # usernames teamAutoGenUser1 to teamAutoGenUser5 and otherareasAutoGenUser1 to otherareasAutoGenUser10
    # all using the password stored in your demo.env _AUTO_USER_PASS
    # You can now use these in your tests:

