# Alfurquan-API

## Code of Conduct

1. File name should be on `snake_case`.
2. Export from a file should always be individual exports `export const fnName = () => '';'` rather than `export default {}` unless until required.
   1. Valid
      ```javascript
      export const getAllUserRecords = async (tenantReference: string) => {
        return UserModel.find({ tenantReference }).select("-password").exec();
      };
      ```
   2. Invalid (Should be done iff it's absolutely required.)
      ```javascript
      const getAllUserRecords = async (tenantReference: string) => {
        return UserModel.find({ tenantReference }).select("-password").exec();
      };
      export default { getAllUserRecords };
      ```
3. Function, Class name format
   1. Function name should always be on `camelCase`.
   2. Class name should always be on `PascalCase`.
4. API Response handling (Exceptions or API logging should be done using middlewares or plugins)

   1. Valid response handling

      ```javascript
          async getAllUsers(req: Request, h: ResponseToolkit) {
                  const validationResult = getUsersListInputValidation.parse({
                    query: req.query
                  });

                  if (!validationResult) throw new ZodError(validationResult);

                  return userOps.getAllUserRecords(req.query.tenantReference);
           }
      ```

   2. Invalid response handling
      ```javascript
          async getUserRecordById(req: Request, h: ResponseToolkit) {
           const { userId } = req.params;
           return userOps.getUserRecordById(String(userId))
                 .then(user => successResponse(h, user ?? {}))
                 .catch((err: Error) => { throw badRequest(err.message) });
           };
          }
      ```

5. API response format
   1. Valid (Should only return back the data)
      ```javascript
          async getUserRecordById(req: Request, h: ResponseToolkit) {
           return [{}];
          }
      ```
   2. Invalid (Structuring the response)
      ```javascript
          async getUserRecordById(req: Request, h: ResponseToolkit) {
           return {success: true, message: '', data: [{}]};
          }
      ```
6. Unused dependencies should not be persisted.
7. `@types/*` dependencies to be added as `devDependencies`
8. `try {} catch {}` block should not be used on handler (Can be used if finer control required). Rather it should be handled on middleware / plugin.
9. Sensitive data should not be pushed to source control at any cause.
10. Use of `enums` are advised in case of standard options like `enum TableStatus {ON_HOLD='On Hold'}`
11. Functions should be documented using both TypeDefinitions `export const fnName = (name:string):string => '';'` and JSDoc
12. Commit message should follow Git conventional commit format. [Refer here.](https://www.conventionalcommits.org/en/v1.0.0/)

---

## Getting Started

| Step | Description                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1.   | **Install Dependencies:** Run the following command in your terminal to install the project dependencies: `yarn` or `yarn install` |

## Running the application

```bash
# development
$ yarn run dev

# build
$ yarn run start:api

```

## To build the application

```bash
$ yarn run build
```

## To format the code

```bash
# eslint-config-prettier format
$ yarn run format
```

## Running ES Lint Scan

```bash
# eslint scan
$ yarn run lint
```

## Running SonarQube Scan

```bash
# Code Quality Sacn
$ yarn run sonar
```

## Infisical Deployment

```bash
Step1: Machine Identify verification and
# Export infisical token
export INFISICAL_TOKEN=$(infisical login --domain=https://safe.ifour.io/api --method=universal-auth --client-id=4876369a-f46b-498e-aa1a-34cd61ef4796 --client-secret=516edd87dccf89f70c27f0a28c6727f36a4cb9518f4ebe2aa51f6bdaf6f0f361 --plain --silent)

#To check the infisical token
echo $INFISICAL_TOKEN

```
