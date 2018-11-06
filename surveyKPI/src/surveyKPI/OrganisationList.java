package surveyKPI;

/*
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

*/

import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.commons.io.FileUtils;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.SDDataSource;
import org.smap.sdal.managers.CsvTableManager;
import org.smap.sdal.managers.OrganisationManager;
import org.smap.sdal.model.DeviceSettings;
import org.smap.sdal.model.Organisation;
import org.smap.sdal.model.Project;
import org.smap.sdal.model.Role;
import org.smap.sdal.model.SensitiveData;
import org.smap.sdal.model.User;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Type;
import java.sql.*;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.logging.Level;
import java.util.logging.Logger;

/*
 * Returns a list of all projects that are in the same organisation as the user making the request
 */
@Path("/organisationList")
public class OrganisationList extends Application {
	
	Authorise a = null;
	Authorise aAdmin = null;
	Authorise aSecurity = null;

	private static Logger log =
			 Logger.getLogger(OrganisationList.class.getName());
	
	public OrganisationList() {
		
		a = new Authorise(null, Authorise.ORG);
		
		ArrayList<String> authorisations = new ArrayList<String> ();	
		authorisations.add(Authorise.ANALYST);
		authorisations.add(Authorise.ADMIN);
		aAdmin = new Authorise(authorisations, null);
		
		aSecurity = new Authorise(null, Authorise.SECURITY);
	}
	
	@GET
	@Produces("application/json")
	public Response getOrganisations(@Context HttpServletRequest request) { 

		Response response = null;
		
		// Authorisation - Access
		Connection sd = SDDataSource.getConnection("surveyKPI-OrganisationList-getOrganisations");
		a.isAuthorised(sd, request.getRemoteUser());
		// End Authorisation
		
		PreparedStatement pstmt = null;
		ArrayList<Organisation> organisations = new ArrayList<Organisation> ();
		
		try {
			String sql = null;
			ResultSet resultSet = null;
			
			/*
			 * Get the organisation
			 */
			sql = "select id, name, "
					+ "company_name, "
					+ "company_address, "
					+ "company_phone, "
					+ "company_email, "
					+ "allow_email, "
					+ "allow_facebook, "
					+ "allow_twitter, "
					+ "can_edit, "
					+ "email_task, "
					+ "ft_delete,"
					+ "ft_send_location,"
					+ "ft_sync_incomplete,"
					+ "ft_odk_style_menus,"
					+ "ft_specify_instancename,"
					+ "ft_admin_menu,"
					+ "ft_review_final,"
					+ "ft_send,"
					+ "ft_number_tasks,"
					+ "ft_image_size,"
					+ "changed_by, "
					+ "changed_ts," 
					+ "admin_email, "
					+ "smtp_host, "
					+ "email_domain, "
					+ "email_user, "
					+ "email_password, "
					+ "email_port, "
					+ "default_email_content, "
					+ "website, "
					+ "locale,"
					+ "timezone,"
					+ "server_description "
					+ "from organisation "
					+ "order by name asc;";			
						
			pstmt = sd.prepareStatement(sql);
			log.info("Get organisation list: " + pstmt.toString());
			resultSet = pstmt.executeQuery();
			
			while(resultSet.next()) {
				Organisation org = new Organisation();
				org.id = resultSet.getInt("id");
				org.name = resultSet.getString("name");
				org.company_name = resultSet.getString("company_name");
				org.company_address = resultSet.getString("company_address");
				org.company_phone = resultSet.getString("company_phone");
				org.company_email = resultSet.getString("company_email");
				org.allow_email = resultSet.getBoolean("allow_email");
				org.allow_facebook = resultSet.getBoolean("allow_facebook");
				org.allow_twitter = resultSet.getBoolean("allow_twitter"); 
				org.can_edit = resultSet.getBoolean("can_edit");
				org.email_task = resultSet.getBoolean("email_task");
				org.ft_delete = resultSet.getString("ft_delete");
				org.ft_send_location = resultSet.getString("ft_send_location");
				org.ft_sync_incomplete = resultSet.getBoolean("ft_sync_incomplete");
				org.ft_odk_style_menus = resultSet.getBoolean("ft_odk_style_menus");
				org.ft_specify_instancename = resultSet.getBoolean("ft_specify_instancename");
				org.ft_admin_menu = resultSet.getBoolean("ft_admin_menu");
				org.ft_review_final = resultSet.getBoolean("ft_review_final");
				org.ft_send = resultSet.getString("ft_send");
				org.ft_number_tasks = resultSet.getInt("ft_number_tasks");
				org.ft_image_size = resultSet.getString("ft_image_size");
				org.changed_by = resultSet.getString("changed_by");
				org.changed_ts = resultSet.getString("changed_ts");
				org.admin_email = resultSet.getString("admin_email");
				org.smtp_host = resultSet.getString("smtp_host");
				org.email_domain = resultSet.getString("email_domain");
				org.email_user = resultSet.getString("email_user");
				org.email_password = resultSet.getString("email_password");
				org.email_port = resultSet.getInt("email_port");
				org.default_email_content = resultSet.getString("default_email_content");
				org.website = resultSet.getString("website");
				org.locale = resultSet.getString("locale");
				if(org.locale == null) {
					org.locale = "en";	// Default english
				}
				org.timeZone = resultSet.getString("timeZone");
				if(org.timeZone == null) {
					org.timeZone = "UTC";
				}
				org.server_description = resultSet.getString("server_description");
				organisations.add(org);
			}
	
			Gson gson = new GsonBuilder().disableHtmlEscaping().create();
			String resp = gson.toJson(organisations);
			response = Response.ok(resp).build();
			
				
		} catch (Exception e) {
			
			log.log(Level.SEVERE,"Error: ", e);
		    response = Response.serverError().build();
		    
		} finally {
			try {if (pstmt != null) {pstmt.close();} } catch (SQLException e) {}
			SDDataSource.closeConnection("surveyKPI-OrganisationList-getOrganisations", sd);
		}

		return response;
	}
	
	/*
	 * Update the organisation details or create a new organisation
	 */
	@POST
	public Response updateOrganisation(@Context HttpServletRequest request) { 
		
		Response response = null;
		DiskFileItemFactory  fileItemFactory = new DiskFileItemFactory ();	
		fileItemFactory.setSizeThreshold(1*1024*1024); //1 MB TODO handle this with exception and redirect to an error page
		ServletFileUpload uploadHandler = new ServletFileUpload(fileItemFactory);
		
		// Authorisation - Access
		Connection sd = SDDataSource.getConnection("surveyKPI-OrganisationList-updateOrganisation");
		a.isAuthorised(sd, request.getRemoteUser());
		// End Authorisation

		FileItem logoItem = null;
		String fileName = null;
		String organisations = null;
		try {
			/*
			 * Parse the request
			 */
			List<?> items = uploadHandler.parseRequest(request);
			Iterator<?> itr = items.iterator();

			while(itr.hasNext()) {
				FileItem item = (FileItem) itr.next();
				
				if(item.isFormField()) {
					log.info("Form field:" + item.getFieldName() + " - " + item.getString());
				
					
					if(item.getFieldName().equals("settings")) {
						try {
							organisations = item.getString();
						} catch (Exception e) {
							
						}
					}
					
					
				} else if(!item.isFormField()) {
					// Handle Uploaded files.
					log.info("Field Name = "+item.getFieldName()+
						", File Name = "+item.getName()+
						", Content type = "+item.getContentType()+
						", File Size = "+item.getSize());
					
					if(item.getSize() > 0) {
						logoItem = item;
						fileName = item.getName();
						fileName = fileName.replaceAll(" ", "_"); // Remove spaces from file name
					}
					
				}

			}
			
			Type type = new TypeToken<ArrayList<Organisation>>(){}.getType();		
			ArrayList<Organisation> oArray = new Gson().fromJson(organisations, type);
				
			String requestUrl = request.getRequestURL().toString();
			String userIdent = request.getRemoteUser();
			String basePath = GeneralUtilityMethods.getBasePath(request);
				
			OrganisationManager om = new OrganisationManager();
			for(int i = 0; i < oArray.size(); i++) {
				Organisation o = oArray.get(i);
				if(o.id == -1) {
					// New organisation
						
					om.createOrganisation(
							sd, 
							o, 
							userIdent, 
							fileName,
							requestUrl,
							basePath,
							logoItem,
							null);
					
						 
				} else {
					// Existing organisation

					om.updateOrganisation(
							sd, 
							o, 
							userIdent, 
							fileName,
							requestUrl,
							basePath,
							logoItem);	
				}
			
				response = Response.ok().build();
			}
				
		} catch (SQLException e) {
			String state = e.getSQLState();
			log.info("Update Organisation: sql state:" + state);
			if(state.startsWith("23")) {
				response = Response.status(Status.CONFLICT).entity(e.getMessage()).build();
			} else {
				response = Response.serverError().entity(e.getMessage()).build();
				log.log(Level.SEVERE,"Error", e);
			}
		} catch (FileUploadException ex) {
			response = Response.serverError().entity(ex.getMessage()).build();
			log.log(Level.SEVERE,"Error", ex);
			
		} finally {
			
			SDDataSource.closeConnection("surveyKPI-OrganisationList-updateOrganisation", sd);
		}
		
		return response;
	}
	
	/*
	 * Update the sensitive data for for an organisation
	 */
	@POST
	@Path("/sensitive")
	public Response updateOrganisationSensitiveData(@Context HttpServletRequest request, @FormParam("sensitive") String sensitive) { 
			
		Response response = null;	
		
		String connectionString = "surveyKPI-updateSensitiveData";
		// Authorisation - Access
		Connection sd = SDDataSource.getConnection(connectionString);
		aSecurity.isAuthorised(sd, request.getRemoteUser());
		// End Authorisation

		try {
			SensitiveData sensitiveData = new Gson().fromJson(sensitive, SensitiveData.class);	
			int oId = GeneralUtilityMethods.getOrganisationId(sd, request.getRemoteUser(), 0);		
			OrganisationManager om = new OrganisationManager();
			om.updateSensitiveData(sd, oId, sensitiveData);		
			
			response = Response.ok().build();
				
		} catch (SQLException e) {
			response = Response.serverError().entity(e.getMessage()).build();
			log.log(Level.SEVERE,"Error", e);
		} finally {
			
			SDDataSource.closeConnection(connectionString, sd);
		}
		
		return response;
	}
	
	@GET
	@Path("/device")
	public Response getDeviceSettings(@Context HttpServletRequest request) {
		Response response = null;
		
		// Authorisation - Access
		Connection sd = SDDataSource.getConnection("surveyKPI-OrganisationList-getDeviceSettings");
		aAdmin.isAuthorised(sd, request.getRemoteUser());
		// End Authorisation
		
		String sql = "select ft_delete, ft_send_location, ft_odk_style_menus, "
				+ "ft_specify_instancename, ft_admin_menu,"
				+ "ft_review_final, ft_send, ft_number_tasks, ft_image_size "
				+ "from organisation "
				+ "where "
				+ "id = (select o_id from users where ident = ?)";
	
		PreparedStatement pstmt = null;
		
		try {
			pstmt = sd.prepareStatement(sql);	
			pstmt.setString(1, request.getRemoteUser());
					
			log.info("Get organisation device details: " + pstmt.toString());
			ResultSet rs = pstmt.executeQuery();
			
			if(rs.next()) {
				DeviceSettings d = new DeviceSettings();
				d.ft_delete = rs.getString(1);
				d.ft_send_location= rs.getString(2);
				d.ft_odk_style_menus = rs.getBoolean(3);
				d.ft_specify_instancename = rs.getBoolean(4);
				d.ft_admin_menu = rs.getBoolean(5);
				d.ft_review_final = rs.getBoolean(6);
				d.ft_send = rs.getString(7);
				d.ft_number_tasks = rs.getInt(8);
				d.ft_image_size = rs.getString(9);
				
				Gson gson = new GsonBuilder().disableHtmlEscaping().create();
				String resp = gson.toJson(d);
				response = Response.ok(resp).build();
			} else {
				response = Response.serverError().entity("not found").build();
			}
			
		} catch (SQLException e) {
			log.log(Level.SEVERE, "Exception", e);
			response = Response.serverError().entity(e.getMessage()).build();
		} finally {			
			try {if (pstmt != null) {pstmt.close();} } catch (SQLException e) {	}	
			SDDataSource.closeConnection("surveyKPI-OrganisationList-getDeviceSettings", sd);
		}
		
		return response;
	}
	
	@GET
	@Path("/sensitive")
	public Response getSensitivitySettings(@Context HttpServletRequest request) {
		Response response = null;
		
		String connectionString = "surveyKPI-OrganisationList-getSensitivitySettings";
		
		// Authorisation - Access
		Connection sd = SDDataSource.getConnection(connectionString);
		aAdmin.isAuthorised(sd, request.getRemoteUser());
		// End Authorisation
		
		String sql = "select sensitive_data "
				+ "from organisation "
				+ "where "
				+ "id = (select o_id from users where ident = ?)";	
		PreparedStatement pstmt = null;
		
		try {
			pstmt = sd.prepareStatement(sql);	
			pstmt.setString(1, request.getRemoteUser());
					
			log.info("Get organisation sensitivity details: " + pstmt.toString());
			ResultSet rs = pstmt.executeQuery();
			
			if(rs.next()) {
				String resp = rs.getString(1);
				if(resp == null || resp.length() == 0) {
					resp = "{}";
				}
				response = Response.ok(resp).build();
			} else {
				response = Response.serverError().entity("{}").build();
			}
			
	
		} catch (SQLException e) {
			log.log(Level.SEVERE, "Exception", e);
			response = Response.serverError().entity(e.getMessage()).build();
		} finally {			
			try {if (pstmt != null) {pstmt.close();} } catch (SQLException e) {	}	
			SDDataSource.closeConnection(connectionString, sd);
		}
		
		return response;
	}

	
	@POST
	@Path("/device")
	public Response updateDeviceSettings(@Context HttpServletRequest request, @FormParam("settings") String settings) {
		Response response = null;
		
		// Authorisation - Access
		Connection sd = SDDataSource.getConnection("surveyKPI-OrganisationList-updateDeviceSettings");
		aAdmin.isAuthorised(sd, request.getRemoteUser());
		// End Authorisation
		
		String sql = "update organisation set " +
			
				" ft_delete = ?, " +
				" ft_send_location = ?, " +
				" ft_odk_style_menus = ?, " +
				" ft_specify_instancename = ?, " +
				" ft_admin_menu = ?, " +
				" ft_review_final = ?, " +
				" ft_send = ?, " +
				" ft_number_tasks = ?, " +
				" ft_image_size = ?, " +
				" changed_by = ?, " + 
				" changed_ts = now() " + 
				" where " +
				" id = (select o_id from users where ident = ?)";
	
		PreparedStatement pstmt = null;
		
		try {
			DeviceSettings d = new Gson().fromJson(settings, DeviceSettings.class);
			pstmt = sd.prepareStatement(sql);
			pstmt.setString(1, d.ft_delete);
			pstmt.setString(2, d.ft_send_location);
			pstmt.setBoolean(3, d.ft_odk_style_menus);
			pstmt.setBoolean(4, d.ft_specify_instancename);
			pstmt.setBoolean(5, d.ft_admin_menu);
			pstmt.setBoolean(6, d.ft_review_final);
			pstmt.setString(7, d.ft_send);
			pstmt.setInt(8, d.ft_number_tasks);
			pstmt.setString(9, d.ft_image_size);
			pstmt.setString(10, request.getRemoteUser());
			pstmt.setString(11, request.getRemoteUser());
					
			log.info("Update organisation with device details: " + pstmt.toString());
			pstmt.executeUpdate();
			
			response = Response.ok().build();
	
		} catch (SQLException e) {
			log.log(Level.SEVERE, "Exception", e);
			response = Response.serverError().entity(e.getMessage()).build();
		} finally {			
			try {if (pstmt != null) {pstmt.close();} } catch (SQLException e) {	}		
			SDDataSource.closeConnection("surveyKPI-OrganisationList-updateDeviceSettings", sd);
		}
		
		return response;
	}

	
	/*
	 * Delete an organisation
	 */
	@DELETE
	@Consumes("application/json")
	public Response delOrganisation(@Context HttpServletRequest request, @FormParam("organisations") String organisations) { 
		
		Response response = null;
		
		// Authorisation - Access
		Connection sd = SDDataSource.getConnection("surveyKPI-OrganisationList-delOrganisation");
		a.isAuthorised(sd, request.getRemoteUser());
		// End Authorisation
		
		Type type = new TypeToken<ArrayList<Organisation>>(){}.getType();		
		ArrayList<Organisation> oArray = new Gson().fromJson(organisations, type);
		
		PreparedStatement pstmt = null;
		PreparedStatement pstmtDrop = null;
		try {	
			
			// Get the users locale
			Locale locale = new Locale(GeneralUtilityMethods.getUserLanguage(sd, request, request.getRemoteUser()));
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);
			
			String sql = null;
			ResultSet resultSet = null;
			sd.setAutoCommit(false);
				
			for(int i = 0; i < oArray.size(); i++) {
				Organisation o = oArray.get(i);
				
				/*
				 * Ensure that there are no undeleted projects with surveys in this organisation
				 */
				sql = "SELECT count(*) " +
						" from project p, survey s " +  
						" where p.id = s.p_id " +
						" and p.o_id = ? " +
						" and s.deleted = 'false';";
					
				pstmt = sd.prepareStatement(sql);
				pstmt.setInt(1, o.id);
				log.info("SQL check for projects in an organisation: " + pstmt.toString());
				resultSet = pstmt.executeQuery();
				if(resultSet.next()) {
					int count = resultSet.getInt(1);
					if(count > 0) {
						log.info("Count of undeleted projects:" + count);
						throw new Exception("Error: Organisation " + o.name + " has undeleted projects.");
					}
				} else {
					throw new Exception("Error getting project count");
				}
					
				sql = "DELETE FROM organisation o " +  
						" WHERE o.id = ?; ";			
				
				if(pstmt != null) try{pstmt.close();}catch(Exception e) {}
				pstmt = sd.prepareStatement(sql);
				pstmt.setInt(1, o.id);
				log.info("SQL: " + sql + ":" + o.id);
				pstmt.executeUpdate();
				
			    // Delete the organisation shared resources - not necessary
			    CsvTableManager tm = new CsvTableManager(sd, localisation);
			    tm.delete(o.id, 0, null);		
			    
				// Delete the organisation folder
				String basePath = GeneralUtilityMethods.getBasePath(request);
				String fileFolder = basePath + "/media/organisation/" + o.id;
			    File folder = new File(fileFolder);
			    try {
			    	log.info("Deleting organisation folder: " + fileFolder);
					FileUtils.deleteDirectory(folder);
				} catch (IOException e) {
					log.info("Error deleting organisation folder:" + fileFolder + " : " + e.getMessage());
				}	    
			}
			
			response = Response.ok().build();
			sd.commit();
				
		} catch (SQLException e) {
			String state = e.getSQLState();
			log.info("Delete organisation: sql state:" + state);
			response = Response.serverError().entity(e.getMessage()).build();
			log.log(Level.SEVERE,"Error", e);
			try { sd.rollback();} catch (Exception ex){log.log(Level.SEVERE,"", ex);}
			
		} catch (Exception ex) {
			log.info(ex.getMessage());
			response = Response.serverError().entity(ex.getMessage()).build();
			
			try{
				sd.rollback();
			} catch(Exception e2) {
				
			}
			
		} finally {
			
			try {if (pstmt != null) {pstmt.close();}} catch (SQLException e) {}
			try {if (pstmtDrop != null) {pstmtDrop.close();}} catch (SQLException e) {}
			
			SDDataSource.closeConnection("surveyKPI-OrganisationList-delOrganisation", sd);
		}
		
		return response;
	}
	
	/*
	 * Change the organisation a user belongs to
	 */
	@POST
	@Path("/setOrganisation")
	@Consumes("application/json")
	public Response changeOrganisation(@Context HttpServletRequest request,
			@FormParam("orgId") int orgId,
			@FormParam("users") String users,
			@FormParam("projects") String projects) { 
		
		Response response = null;
		
		// Authorisation - Access
		Connection sd = SDDataSource.getConnection("surveyKPI-OrganisationList-setOrganisation");
		a.isAuthorised(sd, request.getRemoteUser());
		// End Authorisation
		
		Type type = new TypeToken<ArrayList<User>>(){}.getType();		
		ArrayList<User> uArray = new Gson().fromJson(users, type);
		
		type = new TypeToken<ArrayList<Project>>(){}.getType();		
		ArrayList<Project> pArray = new Gson().fromJson(projects, type);
		
		PreparedStatement pstmt = null;
		PreparedStatement pstmt2 = null;
		PreparedStatement pstmt3 = null;
		PreparedStatement pstmt4 = null;
		try {	
			sd.setAutoCommit(false);
			
			String sql = "update users set o_id =  ? " +  
					" WHERE id = ?; ";			
			String sql2 = "delete from user_project where u_id = ? and " +
					"p_id not in (select id from project where o_id = ?);";	
			String sql3 = "update project set o_id =  ? " +  
					" WHERE id = ?; ";			
			String sql4 = "delete from user_project where p_id = ? and " +
					"u_id not in (select id from users where o_id = ?); ";	
			
	
			pstmt = sd.prepareStatement(sql);
			pstmt2 = sd.prepareStatement(sql2);	
			pstmt3 = sd.prepareStatement(sql3);	
			pstmt4 = sd.prepareStatement(sql4);	

			// Move Users
			for(int i = 0; i < uArray.size(); i++) {
				pstmt.setInt(1, orgId);
				pstmt.setInt(2, uArray.get(i).id);

				log.info("Move User: " + pstmt.toString());
				pstmt.executeUpdate();
				
				log.info("userevent: " + request.getRemoteUser() + " : move user : " + uArray.get(i).id + " to: " + orgId);
			}
			
			// Move Projects
			for(int i = 0; i < pArray.size(); i++) {
				pstmt3.setInt(1, orgId);
				pstmt3.setInt(2, pArray.get(i).id);
				
				log.info("Move Project: " + pstmt3.toString());
				pstmt3.executeUpdate();
				
				log.info("userevent: " + request.getRemoteUser() + " : move project : " + pArray.get(i).id + " to: " + orgId);
			}
			
			// Remove projects from users if they are in a different organisation
			for(int i = 0; i < uArray.size(); i++) {
				
				if(!uArray.get(i).keepProjects) {	// Org admin users keep all of their projects
				
					pstmt2.setInt(1, uArray.get(i).id);
					pstmt2.setInt(2, orgId);
					log.info("Delete Links to projects: " + pstmt2.toString());
					pstmt2.executeUpdate();
				}
			}
			
			// Move users from projects if they are in a different organisation
			for(int i = 0; i < pArray.size(); i++) {
				
				pstmt4.setInt(1, pArray.get(i).id);
				pstmt4.setInt(2, orgId);
				log.info("Delete Links to users: " + pstmt4.toString());
				pstmt4.executeUpdate();

			}
			
			response = Response.ok().build();
			sd.commit();
				
		} catch (SQLException e) {
			String state = e.getSQLState();
			log.info("Change organisation. sql state:" + state);
			response = Response.serverError().entity(e.getMessage()).build();
			log.log(Level.SEVERE,"Error", e);
			try { sd.rollback();} catch (Exception ex){log.log(Level.SEVERE,"", ex);}
			
		} catch (Exception ex) {
			log.info(ex.getMessage());
			response = Response.serverError().entity(ex.getMessage()).build();			
			try{	sd.rollback();	} catch(Exception e2) {}
			
		} finally {
			
			try {if (pstmt != null) {pstmt.close();}	} catch (SQLException e) {}
			try {if (pstmt2 != null) {pstmt2.close();}	} catch (SQLException e) {}
			try {if (pstmt3 != null) {pstmt3.close();}	} catch (SQLException e) {}
			try {if (pstmt4 != null) {pstmt4.close();}	} catch (SQLException e) {}
			
			SDDataSource.closeConnection("surveyKPI-OrganisationList-setOrganisation", sd);
		}
		
		return response;
	}

}

