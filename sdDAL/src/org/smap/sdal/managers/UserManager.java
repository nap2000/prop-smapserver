package org.smap.sdal.managers;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.ResourceBundle;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.smap.sdal.Utilities.ApplicationException;
import org.smap.sdal.Utilities.MediaInfo;
import org.smap.sdal.Utilities.SDDataSource;
import org.smap.sdal.Utilities.UtilityMethodsEmail;
import org.smap.sdal.model.Alert;
import org.smap.sdal.model.EmailServer;
import org.smap.sdal.model.Organisation;
import org.smap.sdal.model.Project;
import org.smap.sdal.model.Role;
import org.smap.sdal.model.User;
import org.smap.sdal.model.UserGroup;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

/*****************************************************************************

This file is part of SMAP.

SMAP is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SMAP is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

 ******************************************************************************/

/*
 * This class supports access to User and Organsiation information in the database
 */
public class UserManager {

	private static Logger log =
			Logger.getLogger(UserManager.class.getName());

	/*
	 * Get the user details
	 */
	public User getByIdent(
			Connection connectionSD,
			String ident
			) throws Exception {

		PreparedStatement pstmt = null;

		User user = new User ();

		try {
			String sql = null;
			ResultSet resultSet = null;			

			/*
			 * Get the user details
			 */
			sql = "SELECT u.id as id, "
					+ "u.name as name, "
					+ "u.settings as settings, "
					+ "u.signature as signature, "
					+ "u.language as language, "
					+ "u.email as email, "
					+ "u.current_project_id as current_project_id, "
					+ "u.current_survey_id as current_survey_id, "
					+ "u.current_task_group_id as current_task_group_id, "
					+ "u.lastalert, "
					+ "u.seen,"
					+ "o.id as o_id, "
					+ "o.name as organisation_name, "
					+ "o.company_name as company_name, "
					+ "o.company_address as company_address, "
					+ "o.company_phone as company_phone, "
					+ "o.company_email as company_email, "
					+ "o.allow_email, "
					+ "o.allow_facebook, "
					+ "o.allow_twitter, "
					+ "o.can_edit, "
					+ "o.email_task, "
					+ "o.ft_send_location, "
					+ "o.billing_enabled "
					+ " from users u, organisation o "
					+ " where u.ident = ? "
					+ " and u.o_id = o.id "
					+ " order by u.ident;"; 

			pstmt = connectionSD.prepareStatement(sql);
			pstmt.setString(1, ident);
			log.info("Get user details: " + pstmt.toString());
			resultSet = pstmt.executeQuery();

			while(resultSet.next()) {
				user.id = resultSet.getInt("id");
				user.ident = ident;
				user.name = resultSet.getString("name");
				user.settings = resultSet.getString("settings");
				String sigFile = resultSet.getString("signature");

				if(sigFile != null) {
					sigFile= sigFile.trim();
					if(sigFile.startsWith("/")) {	// Old versions of smap stored a URL rather than the file name, get the file name if this is the case
						int idx = sigFile.lastIndexOf("/");
						sigFile = sigFile.substring(idx + 1);
					}
					user.signature = sigFile;
				}
				user.language = resultSet.getString("language");
				user.email = resultSet.getString("email");
				user.current_project_id = resultSet.getInt("current_project_id");
				user.current_survey_id = resultSet.getInt("current_survey_id");
				user.current_task_group_id = resultSet.getInt("current_task_group_id");
				user.o_id = resultSet.getInt("o_id");
				user.organisation_name = resultSet.getString("organisation_name");
				user.company_name = resultSet.getString("company_name");
				user.company_address = resultSet.getString("company_address");
				user.company_phone = resultSet.getString("company_phone");
				user.company_email = resultSet.getString("company_email");
				user.allow_email = resultSet.getBoolean("allow_email");
				user.allow_facebook = resultSet.getBoolean("allow_facebook");
				user.allow_twitter = resultSet.getBoolean("allow_twitter");
				user.can_edit = resultSet.getBoolean("can_edit");
				user.email_task = resultSet.getBoolean("email_task");
				user.ft_send_location = resultSet.getString("ft_send_location");
				user.lastalert = resultSet.getString("lastalert");
				user.seen = resultSet.getBoolean("seen");
				user.billing_enabled = resultSet.getBoolean("billing_enabled");
			}

			/*
			 * Set a flag if email is enabled on the server
			 */
			user.sendEmail = UtilityMethodsEmail.getSmtpHost(connectionSD, null, ident) != null;

			/*
			 * Get the groups that the user belongs to
			 */
			sql = "SELECT g.id as id, g.name as name " +
					" from groups g, user_group ug " +
					" where g.id = ug.g_id " +
					" and ug.u_id = ? " +
					" order by g.name;";

			if(pstmt != null) try {pstmt.close();} catch(Exception e) {};
			pstmt = connectionSD.prepareStatement(sql);
			pstmt.setInt(1, user.id);
			log.info("SQL: " + pstmt.toString());
			resultSet = pstmt.executeQuery();

			while(resultSet.next()) {
				if(user.groups == null) {
					user.groups = new ArrayList<UserGroup> ();
				}
				UserGroup group = new UserGroup();
				group.id = resultSet.getInt("id");
				group.name = resultSet.getString("name");
				user.groups.add(group);
			}

			/*
			 * Get the projects that the user belongs to
			 */
			sql = "SELECT p.id as id, p.name as name " +
					" from project p, user_project up " +
					" where p.id = up.p_id " +
					" and up.u_id = ? " +
					" order by p.name;";

			if(pstmt != null) try {pstmt.close();} catch(Exception e) {};
			pstmt = connectionSD.prepareStatement(sql);
			pstmt.setInt(1, user.id);

			log.info("SQL: " + pstmt.toString());
			resultSet = pstmt.executeQuery();

			while(resultSet.next()) {
				if(user.projects == null) {
					user.projects = new ArrayList<Project> ();
				}
				Project project = new Project();
				project.id = resultSet.getInt("id");
				project.name = resultSet.getString("name");
				user.projects.add(project);
			}		

			/*
			 * Get the roles that the user belongs to
			 */
			sql = "SELECT r.id as id, r.name as name " +
					" from role r, user_role ur " +
					" where r.id = ur.r_id " +
					" and ur.u_id = ? " +
					" order by r.name asc";

			if(pstmt != null) try {pstmt.close();} catch(Exception e) {};
			pstmt = connectionSD.prepareStatement(sql);
			pstmt.setInt(1, user.id);

			log.info("SQL: " + pstmt.toString());
			resultSet = pstmt.executeQuery();

			while(resultSet.next()) {
				if(user.roles == null) {
					user.roles = new ArrayList<Role> ();
				}
				Role role = new Role();
				role.id = resultSet.getInt("id");
				role.name = resultSet.getString("name");
				user.roles.add(role);
			}		

		} catch (Exception e) {
			log.log(Level.SEVERE,"Error", e);
			throw new Exception(e);

		} finally {
			try {
				if (pstmt != null) {
					pstmt.close();
				}
			} catch (SQLException e) {

			}

		}

		return user;

	}


	/*
	 * Get alerts for a user
	 */
	public ArrayList<Alert> getAlertsByIdent(
			Connection connectionSD,
			String ident
			) throws Exception {

		PreparedStatement pstmt = null;

		ArrayList<Alert> alerts = new ArrayList<Alert> ();

		try {
			String sql = null;
			ResultSet resultSet = null;			

			/*
			 * Get the user details
			 */
			sql = "SELECT "
					+ "a.id as id, "
					+ "a.status as status, "
					+ "a.priority as priority, "
					+ "a.updated_time as updated_time, "
					+ "a.link as link, "
					+ "a.message as message, "
					+ "extract(epoch from (now() - a.updated_time)) as since "
					+ "from alert a, users u "
					+ "where a.u_id = u.id "
					+ "and u.ident = ? "
					+ "order by a.updated_time asc";

			pstmt = connectionSD.prepareStatement(sql);
			pstmt.setString(1, ident);

			log.info("Get alert details: " + pstmt.toString());
			resultSet = pstmt.executeQuery();

			while(resultSet.next()) {
				Alert a = new Alert();
				a.id = resultSet.getInt("id");
				a.userIdent = ident;
				a.status = resultSet.getString("status");
				a.priority = resultSet.getInt("priority");
				a.link = resultSet.getString("link");
				a.message = resultSet.getString("message");
				a.updatedTime = resultSet.getString("updated_time");
				a.since = resultSet.getInt("since");

				alerts.add(a);
			}



		} catch (Exception e) {
			log.log(Level.SEVERE,"Error", e);
			throw new Exception(e);

		} finally {
			try {
				if (pstmt != null) {
					pstmt.close();
				}
			} catch (SQLException e) {

			}

		}

		return alerts;

	}

	/*
	 * Create a new user Parameters:
	 *   u: Details of the new user
	 *   isOrgUser:  Set to true if this user should be an organisational administrator
	 *   userIdent:  The ident of the user creating this user
	 *   serverName: The name of the server they are being created on
	 *   adminName:  The full name of the user creating this user
	 */
	public int createUser(Connection sd, 
			User u, 
			int o_id, 
			boolean isOrgUser, 
			boolean isSecurityManager,
			String userIdent,
			String scheme,
			String serverName,
			String adminName,
			ResourceBundle localisation) throws Exception {

		// Before creating the user check that email is available if it has been requested
		EmailServer emailServer = null;
		String emailKey = null;
		if(u.sendEmail) {
			emailServer = UtilityMethodsEmail.getSmtpHost(sd, null, userIdent);
			if(emailServer.smtpHost == null) {
				throw new Exception(localisation.getString("email_ne2"));
			}
			PeopleManager pm = new PeopleManager(localisation);
			emailKey = pm.getEmailKey(sd, o_id, u.email);
			if(emailKey == null) {
				// Person has unsubscribed
				String msg = localisation.getString("email_us");
				msg = msg.replaceFirst("%s1", u.email);
				throw new ApplicationException(msg);
			}
		}

		int u_id = -1;
		String sql = "insert into users (ident, realm, name, email, o_id, password) " +
				" values (?, ?, ?, ?, ?, md5(?));";

		PreparedStatement pstmt = null;

		try {
			String pwdString = u.ident + ":smap:" + u.password;
			pstmt = sd.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
			pstmt.setString(1, u.ident);
			pstmt.setString(2, "smap");
			pstmt.setString(3, u.name);
			pstmt.setString(4, u.email);
			pstmt.setInt(5, o_id);
			pstmt.setString(6, pwdString);
			log.info("SQL: " + pstmt.toString());
			pstmt.executeUpdate();

			ResultSet rs = pstmt.getGeneratedKeys();
			if (rs.next()){
				u_id = rs.getInt(1);
				insertUserGroupsProjects(sd, u, u_id, isOrgUser, isSecurityManager);
			}

			// Send a notification email to the user
			if(u.sendEmail) {
				log.info("Checking to see if email enabled: " + u.sendEmail);

				log.info("Send email");
				Organisation organisation = UtilityMethodsEmail.getOrganisationDefaults(sd, null, userIdent);

				String subject = localisation.getString("email_ac") + " " + serverName;
				String interval = "48 hours";
				String uuid = UtilityMethodsEmail.setOnetimePassword(sd, pstmt, u.email, interval);
				ArrayList<String> idents = UtilityMethodsEmail.getIdentsFromEmail(sd, pstmt, u.email);
				String sender = "newuser";
				EmailManager em = new EmailManager();
				em.sendEmail(
						u.email, 
						uuid, 
						"newuser", 
						subject, 
						null, 
						sender, 
						adminName, 
						interval, 
						idents, 
						null, 
						null,
						null,
						organisation.getAdminEmail(), 
						emailServer,
						scheme,
						serverName,
						emailKey,
						localisation);

			}
		}  finally {		
			try {if (pstmt != null) {pstmt.close();} } catch (SQLException e) {	}

		}
		return u_id;
	}

	/*
	 * Create a new temporary user
	 */
	public int createTemporaryUser(Connection sd, 
			User u, 
			int o_id) throws Exception {

		int u_id = -1;
		String sql = "insert into users "
				+ "(ident, o_id, email, name, temporary, action_details, single_submission, created) "
				+ "values (?, ?, ?, ?, true, ?, ?, now()) ";

		PreparedStatement pstmt = null;

		Gson gson = new GsonBuilder().disableHtmlEscaping().setDateFormat("yyyy-MM-dd HH:mm:ss").create();

		try {
			pstmt = sd.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
			pstmt.setString(1, u.ident);
			pstmt.setInt(2, o_id);
			pstmt.setString(3, u.email);
			pstmt.setString(4, u.name);
			pstmt.setString(5, gson.toJson(u.action_details));
			pstmt.setBoolean(6, u.singleSubmission);
			log.info("SQL: " + pstmt.toString());
			pstmt.executeUpdate();

			ResultSet rs = pstmt.getGeneratedKeys();
			if (rs.next()){
				u_id = rs.getInt(1);
				insertUserGroupsProjects(sd, u, u_id, false, true);		// The user roles are sourced from the action and have been added by a security manager hence we will act as a security manager here
			}

		}  finally {		
			try {if (pstmt != null) {pstmt.close();} } catch (SQLException e) {	}

		}
		return u_id;
	}

	/*
	 * Update a users details
	 */
	public void updateUser(Connection sd, 
			User u, 
			int o_id, 
			boolean isOrgUser, 
			boolean isSecurityManager,
			String userIdent,
			String serverName,
			String adminName) throws Exception {


		// Check the user is in the same organisation as the administrator doing the editing
		String sql = "SELECT u.id " +
				" FROM users u " +  
				" WHERE u.id = ? " +
				" AND u.o_id = ?;";				


		PreparedStatement pstmt = null;

		try {
			pstmt = sd.prepareStatement(sql);
			pstmt.setInt(1, u.id);
			pstmt.setInt(2, o_id);
			log.info("SQL: " + pstmt.toString());
			ResultSet resultSet = pstmt.executeQuery();

			if(resultSet.next()) {

				// update existing user
				String pwdString = null;
				if(u.password == null) {
					// Do not update the password
					sql = "update users set " +
							" ident = ?, " +
							" realm = ?, " +
							" name = ?, " + 
							" email = ? " +
							" where " +
							" id = ?;";
				} else {
					// Update the password
					sql = "update users set " +
							" ident = ?, " +
							" realm = ?, " +
							" name = ?, " + 
							" email = ?, " +
							" password = md5(?) " +
							" where " +
							" id = ?;";

					pwdString = u.ident + ":smap:" + u.password;
				}

				try {if (pstmt != null) {pstmt.close();}} catch (SQLException e) {}
				pstmt = sd.prepareStatement(sql);
				pstmt.setString(1, u.ident);
				pstmt.setString(2, "smap");
				pstmt.setString(3, u.name);
				pstmt.setString(4, u.email);
				if(u.password == null) {
					pstmt.setInt(5, u.id);
				} else {
					pstmt.setString(5, pwdString);
					pstmt.setInt(6, u.id);
				}

				log.info("SQL: " + pstmt.toString());
				pstmt.executeUpdate();

				// Update the groups, projects and roles
				insertUserGroupsProjects(sd, u, u.id, isOrgUser, isSecurityManager);

			} else {
				throw new Exception("Invalid user");
			}
		} finally {		
			try {if (pstmt != null) {pstmt.close();} } catch (SQLException e) {	}

		}
	}


	private void insertUserGroupsProjects(Connection sd, User u, int u_id, boolean isOrgUser, 
			boolean isSecurityManager) throws SQLException {

		String sql;
		PreparedStatement pstmt = null;
		PreparedStatement pstmtInsertUserGroup = null;
		PreparedStatement pstmtInsertUserRole = null;
		PreparedStatement pstmtInsertProjectGroup = null;

		log.info("Update groups and projects user id:" + u_id);

		// Delete existing user groups
		try {

			String sqlInsertUserGroup = "insert into user_group (u_id, g_id) values (?, ?);";
			pstmtInsertUserGroup = sd.prepareStatement(sqlInsertUserGroup);
			pstmtInsertUserGroup.setInt(1, u_id);

			String sqlInsertUserRole = "insert into user_role (u_id, r_id) values (?, ?);";
			pstmtInsertUserRole = sd.prepareStatement(sqlInsertUserRole);
			pstmtInsertUserRole.setInt(1, u_id);

			String sqlInsertProjectGroup = "insert into user_project (u_id, p_id) values (?, ?);";
			pstmtInsertProjectGroup = sd.prepareStatement(sqlInsertProjectGroup);
			pstmtInsertProjectGroup.setInt(1, u_id);

			/*
			 * Update user groups
			 */
			log.info("Set autocommit false");
			sd.setAutoCommit(false);
			if(isOrgUser) {
				sql = "delete from user_group where u_id = ?;";
			} else if(isSecurityManager) {
				sql = "delete from user_group where u_id = ? and g_id != 4;";					// Cannot change super user group
			} else {
				sql = "delete from user_group where u_id = ? and g_id != 4 and g_id != 6;";		// Cannot change super user group, or security manager
			}

			if(u.groups != null) {
				pstmt = sd.prepareStatement(sql);
				pstmt.setInt(1, u.id);
				log.info("SQL: " + pstmt.toString());
				pstmt.executeUpdate();

				for(int j = 0; j < u.groups.size(); j++) {
					UserGroup g = u.groups.get(j);
					if(g.id != 4 || isOrgUser) {	
						pstmtInsertUserGroup.setInt(2, g.id);
						pstmtInsertUserGroup.executeUpdate();
					}
				}
				sd.commit();	// Commit changes to user group
			} else {
				log.info("No user groups");
			}

			// Delete existing user projects
			if(u.projects != null) {
				sql = "delete from user_project where u_id = ?;";
				try {if (pstmt != null) {pstmt.close();}} catch (SQLException e) {}
				pstmt = sd.prepareStatement(sql);
				pstmt.setInt(1, u.id);
				log.info("SQL: " + pstmt.toString());
				pstmt.executeUpdate();

				for(int j = 0; j < u.projects.size(); j++) {
					Project p = u.projects.get(j);

					pstmtInsertProjectGroup.setInt(2, p.id);
					pstmtInsertProjectGroup.executeUpdate();

				}

				sd.commit();
			} else {
				log.info("No projects to add");
			}

			/*
			 * Update user roles
			 */
			if((isOrgUser || isSecurityManager) && u.roles != null) {
				sql = "delete from user_role where u_id = ?;";

				try {if (pstmt != null) {pstmt.close();}} catch (SQLException e) {}
				pstmt = sd.prepareStatement(sql);
				pstmt.setInt(1, u.id);
				log.info("SQL add roles: " + pstmt.toString());
				pstmt.executeUpdate();

				for(int j = 0; j < u.roles.size(); j++) {
					Role r = u.roles.get(j);
					pstmtInsertUserRole.setInt(2, r.id);
					log.info("Insert user role: " + pstmtInsertUserRole.toString());
					pstmtInsertUserRole.executeUpdate();
				}

				sd.commit();	// Commit changes to user roles
			}

		} catch (Exception e) {
			log.log(Level.SEVERE, e.getMessage(), e);
			try{sd.rollback();} catch(Exception ex) {}
		} finally {
			log.info("Set autocommit true");
			sd.setAutoCommit(true);
			try {if (pstmt != null) {pstmt.close();}} catch (SQLException e) {}
			try {if (pstmtInsertUserGroup != null) {pstmtInsertUserGroup.close();}} catch (SQLException e) {}
			try {if (pstmtInsertUserRole != null) {pstmtInsertUserRole.close();}} catch (SQLException e) {}
			try {if (pstmtInsertProjectGroup != null) {pstmtInsertProjectGroup.close();}} catch (SQLException e) {}
		}

	}
	
	public void deleteSingleSubmissionTemporaryUser(Connection sd, String userIdent) throws SQLException {
		
		String sql = "delete from users where ident = ? "
				+ "and temporary "
				+ "and single_submission ";
		PreparedStatement pstmt = null;
		
		try {	
			pstmt = sd.prepareStatement(sql);
			pstmt.setString(1,  userIdent);	
			log.info("Deleting single submisison user: " + pstmt.toString());
			pstmt.executeUpdate();
			
		} finally {	
			try {pstmt.close();} catch(Exception e) {}
		}
	}

}
