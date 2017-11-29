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
import javax.ws.rs.DELETE;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONObject;
import org.smap.model.TableManager;
import org.smap.sdal.Utilities.AuthorisationException;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.NotFoundException;
import org.smap.sdal.Utilities.ResultsDataSource;
import org.smap.sdal.Utilities.SDDataSource;
import org.smap.sdal.managers.LogManager;
import org.smap.sdal.managers.MessagingManager;
import org.smap.sdal.managers.SurveyManager;
import org.smap.sdal.managers.TaskManager;
import org.smap.sdal.model.AssignFromSurvey;
import org.smap.sdal.model.Assignment;
import org.smap.sdal.model.Features;
import org.smap.sdal.model.Geometry;
import org.smap.sdal.model.SqlFrag;
import org.smap.sdal.model.TaskAddressSettings;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import model.FormDesc;
import taskModel.TaskAddress;
import utilities.ExchangeManager;
import utilities.QuestionInfo;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.lang.reflect.Type;
import java.sql.*;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/*
 * Used by an administrator or analyst to view task status and make updates
 */
@Path("/assignments")
public class AllAssignments extends Application {

	Authorise a = null;;

	private static Logger log =
			Logger.getLogger(Survey.class.getName());

	LogManager lm = new LogManager();		// Application log

	public AllAssignments() {

		ArrayList<String> authorisations = new ArrayList<String> ();	
		authorisations.add(Authorise.ANALYST);
		authorisations.add(Authorise.ADMIN);
		a = new Authorise(authorisations, null);		
	}


	/*
	 * Return the existing assignments
	 */
	@GET
	@Path("/{projectId}")
	@Produces("application/json")
	public Response getAssignments(@Context HttpServletRequest request,
			@PathParam("projectId") int projectId, 
			@QueryParam("user") int user_filter
			) {

		Response response = null;

		// Authorisation - Access
		Connection connectionSD = SDDataSource.getConnection("surveyKPI-AllAssignments");
		a.isAuthorised(connectionSD, request.getRemoteUser());
		a.isValidProject(connectionSD, request.getRemoteUser(), projectId);
		// End Authorisation

		JSONObject jo = new JSONObject();
		JSONArray ja = new JSONArray();
		JSONObject task_groups = new JSONObject();	// Array of task groups
		PreparedStatement pstmt = null;
		PreparedStatement pstmtSurvey = null;
		PreparedStatement pstmtGeo = null;
		try {

			// Get the assignments
			String sql1 = "SELECT " +
					"t.id as task_id," +
					"t.type," +
					"t.title," +
					"t.url," +
					"t.form_id," +
					"t.initial_data," +
					"t.schedule_at," +
					"t.location_trigger," +
					"t.repeat," +
					"a.status as assignment_status," +
					"a.id as assignment_id, " +
					"t.address as address, " +
					"t.geo_type as geo_type, " +
					"u.id as user_id, " +
					"u.ident as ident, " +
					"u.name as user_name, " + 
					"tg.tg_id as task_group_id, " +
					"tg.name as task_group_name " +
					"from task_group tg " +
					"left outer join tasks t on tg.tg_id = t.tg_id " +
					"left outer join assignments a " +
					" on a.task_id = t.id " + 
					" and a.status != 'deleted' " +
					"left outer join users u on a.assignee = u.id " +
					" where tg.p_id = t.p_id " +
					" and tg.p_id = ? ";

			String sql2 = null;
			if(user_filter == 0) {					// All users (default)	
				sql2 = "";							
			} else if(user_filter == -1) {			// Unassigned users
				sql2 = " and u.id is null";
			} else {								// The specified user
				sql2 = " and u.id = ? ";		
			}

			String sql3 = " order by tg.tg_id, t.form_id, t.id;";

			pstmt = connectionSD.prepareStatement(sql1 + sql2 + sql3);	
			pstmt.setInt(1, projectId);
			if(user_filter > 0) {
				pstmt.setInt(2, user_filter);
			}
			log.info("SQL get tasks: " + pstmt.toString());

			// Statement to get survey name
			String sqlSurvey = "select display_name from survey where s_id = ?";
			pstmtSurvey = connectionSD.prepareStatement(sqlSurvey);

			ResultSet resultSet = pstmt.executeQuery();
			int t_id = 0;
			int tg_id = 0;	// Task group id

			while (resultSet.next()) {
				JSONObject jr = new JSONObject();
				JSONObject jp = new JSONObject();
				JSONObject jg = null;

				jr.put("type", "Feature");

				// Create the new Task Assignment Objects

				// Populate the new Task Assignment
				t_id = resultSet.getInt("task_id");
				tg_id = resultSet.getInt("task_group_id");
				jp.put("task_id", t_id);
				jp.put("task_group_id", tg_id);

				String tg_name = resultSet.getString("task_group_name");
				if(tg_name == null || tg_name.trim().length() == 0) {
					jp.put("task_group_name", tg_id);
				} else {
					jp.put("task_group_name", tg_name);
				}

				String taskType = resultSet.getString("type");
				jp.put("type", taskType);
				if(taskType != null && taskType.equals("xform")) {
					int s_id = resultSet.getInt("form_id");
					pstmtSurvey.setInt(1, s_id);
					ResultSet sRs = pstmtSurvey.executeQuery();
					if(sRs.next()) {
						jp.put("survey_name", sRs.getString(1));
					}

				}

				jp.put("assignment_id", resultSet.getInt("assignment_id"));
				String assStatus = resultSet.getString("assignment_status");
				if(assStatus == null) {
					assStatus = "new";
				}
				jp.put("assignment_status", assStatus);

				jp.put("user_id", resultSet.getInt("user_id"));
				jp.put("user_ident", resultSet.getString("ident"));
				String user_name = resultSet.getString("user_name");
				if(user_name == null) {
					user_name = "";
				}
				jp.put("user_name", user_name);
				jp.put("title", resultSet.getString("title"));
				jp.put("address", resultSet.getString("address"));
				jp.put("repeat", resultSet.getBoolean("repeat"));
				jp.put("scheduleAt", resultSet.getTimestamp("schedule_at"));
				jp.put("location_trigger", resultSet.getString("location_trigger"));

				String geo_type = resultSet.getString("geo_type");
				// Get the coordinates
				if(geo_type != null) {
					// Add the coordinates
					jp.put("geo_type", geo_type);

					String sql = null;
					if(geo_type.equals("POINT")) {
						sql = "select ST_AsGeoJSON(geo_point) from tasks where id = ?;";
					} else if (geo_type.equals("POLYGON")) {
						sql = "select ST_AsGeoJSON(geo_polygon) from tasks where id = ?;";
					} else if (geo_type.equals("LINESTRING")) {
						sql = "select ST_AsGeoJSON(geo_linestring) from tasks where id = ?;";
					}
					if(pstmtGeo != null) {pstmtGeo.close();};
					pstmtGeo = connectionSD.prepareStatement(sql);
					pstmtGeo.setInt(1, t_id);
					ResultSet resultSetGeo = pstmtGeo.executeQuery();
					if(resultSetGeo.next()) {
						String geoString = resultSetGeo.getString(1);
						if(geoString != null) {
							jg = new JSONObject(geoString);	
							jr.put("geometry", jg);
						}
					}

				}
				jr.put("properties", jp);
				ja.put(jr);

			}

			jo.put("type", "FeatureCollection");
			jo.put("features", ja);

			/*
			 * Add task group details to the response
			 */
			String sql = "select tg_id, name, address_params from task_group where p_id = ? order by tg_id;";
			if(pstmt != null) {pstmt.close();};
			pstmt = connectionSD.prepareStatement(sql);
			pstmt.setInt(1, projectId);

			log.info("SQL Get task groups: " + pstmt.toString());
			ResultSet tgrs = pstmt.executeQuery();

			while (tgrs.next()) {
				JSONObject tg = new JSONObject();
				tg.put("tg_id", tgrs.getInt(1));
				tg.put("tg_name", tgrs.getString(2));
				tg.put("tg_address_params", tgrs.getString(3));
				task_groups.put(tgrs.getString(1), tg);
			}
			jo.put("task_groups", task_groups);

			response = Response.ok(jo.toString()).build();			

		} catch (SQLException e) {

			log.log(Level.SEVERE,"", e);
			response = Response.serverError().build();
		} catch (Exception e) {

			log.log(Level.SEVERE,"", e);
			response = Response.serverError().build();
		} finally {
			if (pstmt != null) try {pstmt.close();} catch (SQLException e) {};
			if (pstmtSurvey != null) try {pstmtSurvey.close();} catch (SQLException e) {};
			if (pstmtGeo != null) try {pstmtGeo.close();} catch (SQLException e) {};		

			SDDataSource.closeConnection("surveyKPI-AllAssignments", connectionSD);
		}

		return response;
	}

	/*
	 * Add a task for every survey
	 * Add a task for the array of locations passed in the input parameters
	 */
	@POST
	@Path("/addSurvey/{projectId}")
	public Response addSurvey(@Context HttpServletRequest request, 
			@PathParam("projectId") int projectId,
			@FormParam("settings") String settings) { 

		String urlprefix = request.getScheme() + "://" + request.getServerName() + "/";		

		Response response = null;
		ArrayList<TaskAddress> addressArray = null;


		log.info("++++++++++++++++++++++++++++++++++++++ Assignment:" + settings);
		AssignFromSurvey as = new Gson().fromJson(settings, AssignFromSurvey.class);

		log.info("User id: " + as.user_id);

		String userName = request.getRemoteUser();
		int sId = as.source_survey_id;								// Source survey id (optional)

		// Authorisation - Access
		Connection connectionSD = SDDataSource.getConnection("surveyKPI-AllAssignments");
		boolean superUser = false;
		try {
			superUser = GeneralUtilityMethods.isSuperUser(connectionSD, request.getRemoteUser());
		} catch (Exception e) {
		}
		a.isAuthorised(connectionSD, request.getRemoteUser());
		a.isValidProject(connectionSD, request.getRemoteUser(), projectId);
		if(sId > 0) {
			a.isValidSurvey(connectionSD, userName, sId, false, superUser);	// Validate that the user can access this survey
		}
		// End Authorisation

		if(sId > 0) {
			lm.writeLog(connectionSD, sId, request.getRemoteUser(), "create tasks", "Create tasks from survey data");
		}

		Connection connectionRel = null; 
		PreparedStatement pstmt = null;
		PreparedStatement pstmtInsert = null;
		PreparedStatement pstmtAssign = null;
		PreparedStatement pstmtCheckGeom = null;
		PreparedStatement pstmtTaskGroup = null;
		PreparedStatement pstmtGetSurveyIdent = null;
		PreparedStatement pstmtUniqueTg = null;
		
		SqlFrag frag = null;

		try {
			connectionRel = ResultsDataSource.getConnection("surveyKPI-AllAssignments");
			log.info("Set autocommit sd false");
			connectionSD.setAutoCommit(false);

			// Localisation
			
			Locale locale = new Locale(GeneralUtilityMethods.getUserLanguage(connectionSD, request.getRemoteUser()));
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);
			
			SurveyManager sm = new SurveyManager(localisation);
			org.smap.sdal.model.Survey survey = null;
			String basePath = GeneralUtilityMethods.getBasePath(request);
			survey = sm.getById(connectionSD, connectionRel, request.getRemoteUser(), sId, true, basePath, 
					null, false, false, false, false, false, "real", false, superUser, 0, "geojson");
			
			
			/*
			 * Create the task group if an existing task group was not specified
			 */
			int taskGroupId = -1;
			Gson gson = new GsonBuilder().disableHtmlEscaping().create();
			ResultSet keys = null;
			if(as.task_group_id <= 0) {

				/*
				 * Check that a task group of this name does not already exist
				 * This would be better implemented as a constraint on the database but existing customers probably have task
				 *  groups with duplicate names
				 */
				String checkUniqeTg = "select count(*) from task_group where name = ? and p_id = ?;";
				pstmtUniqueTg = connectionSD.prepareStatement(checkUniqeTg);
				pstmtUniqueTg.setString(1, as.task_group_name);
				pstmtUniqueTg.setInt(2, projectId);
				log.info("Check uniqueness of task group name in project: " + pstmtUniqueTg.toString());
				ResultSet rs = pstmtUniqueTg.executeQuery();

				if(rs.next()) {
					if(rs.getInt(1) > 0) {
						throw new Exception("Task Group Name " + as.task_group_name + " already Exists");
					}
				}

				String addressParams = gson.toJson(as.address_columns); 	
				String tgSql = "insert into task_group ( "
						+ "name, "
						+ "p_id, "
						+ "address_params,"
						+ "rule,"
						+ "source_s_id) "
						+ "values (?, ?, ?, ?, ?);";

				pstmtTaskGroup = connectionSD.prepareStatement(tgSql, Statement.RETURN_GENERATED_KEYS);
				pstmtTaskGroup.setString(1, as.task_group_name);
				pstmtTaskGroup.setInt(2, projectId);
				pstmtTaskGroup.setString(3, addressParams);
				pstmtTaskGroup.setString(4, settings);
				pstmtTaskGroup.setInt(5, as.source_survey_id);
				log.info("Insert into task group: " + pstmtTaskGroup.toString());
				pstmtTaskGroup.execute();

				connectionSD.commit();		// Success as TG is created, even if there are no existing tasks ready to go this is good

				keys = pstmtTaskGroup.getGeneratedKeys();
				if(keys.next()) {
					taskGroupId = keys.getInt(1);
				}
			} else {
				taskGroupId = as.task_group_id;
			}

			/*
			 * Create the tasks unless no tasks have been specified
			 */
			if(as.target_survey_id > 0) {
				String sql = null;
				ResultSet resultSet = null;
				String insertSql1 = "insert into tasks (" +
						"p_id, " +
						"tg_id, " +
						"type, " +
						"title, " +
						"form_id, " +
						"url, " +
						"geo_type, ";

				String insertSql2 =	
						"initial_data, " +
								"update_id," +
								"address," +
								"schedule_at," +
								"location_trigger) " +
								"values (" +
								"?, " + 
								"?, " + 
								"'xform', " +
								"?, " +
								"?, " +
								"?, " +
								"?, " +	
								"ST_GeomFromText(?, 4326), " +
								"?, " +
								"?, " +
								"?," +
								"now() + interval '7 days'," +  // Schedule for 1 week (TODO allow user to set)
								"?);";		

				String assignSQL = "insert into assignments (assignee, status, task_id) values (?, ?, ?);";
				pstmtAssign = connectionSD.prepareStatement(assignSQL);

				String checkGeomSQL = "select count(*) from information_schema.columns where table_name = ? and column_name = 'the_geom'";
				pstmtCheckGeom = connectionRel.prepareStatement(checkGeomSQL);

				String getSurveyIdentSQL = "select ident from survey where s_id = ?;";
				pstmtGetSurveyIdent = connectionSD.prepareStatement(getSurveyIdentSQL);

				String hostname = request.getServerName();

				pstmtGetSurveyIdent.setInt(1, as.target_survey_id);
				resultSet = pstmtGetSurveyIdent.executeQuery();
				String initial_data_url = null;
				String instanceId = null;
				String locationTrigger = null;
				String target_survey_url = null;
				String target_survey_ident = null;
				if(resultSet.next()) {
					target_survey_ident = resultSet.getString(1);
					target_survey_url = "http://" + hostname + "/formXML?key=" + target_survey_ident;
				} else {
					throw new Exception("Form identifier not found for form id: " + as.target_survey_id);
				}

				/*
				 * Get the tasks from the passed in source survey if this has been set
				 */
				if(sId != -1) {
					/*
					 * Get Forms and row counts in this survey
					 */
					sql = "select distinct f.table_name, f.parentform from form f " +
							"where f.s_id = ? " + 
							"order by f.table_name;";		

					pstmt = connectionSD.prepareStatement(sql);	 
					pstmt.setInt(1, sId);

					log.info("Get forms: " + pstmt.toString());
					resultSet = pstmt.executeQuery();

					while (resultSet.next()) {
						String tableName2 = null;
						String tableName = resultSet.getString(1);
						String p_id = resultSet.getString(2);
						if(p_id == null || p_id.equals("0")) {	// The top level form

							QuestionInfo filterQuestion = null;
							String filterSql = null;
							/*
							 * Check the filters
							 * Advanced filter takes precedence
							 * If that is not set then check simple filter
							 */
							if(as.filter != null && as.filter.advanced != null && as.filter.advanced.length() > 0) {
								log.info("+++++ Using advanced filter: " + as.filter.advanced);
								
								StringBuffer filterQuery = new StringBuffer(tableName);
								filterQuery.append(".instanceid in ");
								filterQuery.append(GeneralUtilityMethods.getFilterCheck(connectionSD, 
										localisation, survey, as.filter.advanced));
								filterSql = filterQuery.toString();
								
								log.info("Query clause: " + filterSql);
								
							} else if(as.filter != null && as.filter.qId > 0) {
								String fValue = null;
								String fValue2 = null;
								filterQuestion = new QuestionInfo(sId, as.filter.qId, connectionSD, false, as.filter.lang, urlprefix);
								log.info("Filter question type: " + as.filter.qType);
								if(as.filter.qType != null) {
									if(as.filter.qType.startsWith("select")) {
										fValue = as.filter.oValue;
									} else if(as.filter.qType.equals("int")) {
										fValue = String.valueOf(as.filter.qInteger);
									} else if(as.filter.qType.equals("date")  || as.filter.qType.equals("dateTime")) {
										Timestamp startDate = new Timestamp(as.filter.qStartDate);
										Timestamp endDate = new Timestamp(as.filter.qEndDate);

										fValue = startDate.toString();
										fValue2 = endDate.toString();
									} else {
										fValue = as.filter.qText;
									}
								}

								filterSql = filterQuestion.getFilterExpression(fValue, fValue2);		
								log.info("filter: " + filterSql);
							}
							// Check to see if this form has geometry columns
							boolean hasGeom = false;
							pstmtCheckGeom.setString(1, tableName);
							log.info("Check for geometry coulumn: " + pstmtCheckGeom.toString());
							ResultSet resultSetGeom = pstmtCheckGeom.executeQuery();
							if(resultSetGeom.next()) {
								if(resultSetGeom.getInt(1) > 0) {
									hasGeom = true;
								}
							}

							// Get the primary key, location and address columns from this top level table
							String getTaskSql = null;
							String getTaskSqlWhere = null;
							String getTaskSqlEnd = null;
							boolean hasInstanceName = GeneralUtilityMethods.hasColumn(connectionRel, tableName, "instancename");

							if(hasGeom) {
								log.info("Has geometry");
								getTaskSql = "select " + tableName +".prikey, ST_AsText(" + tableName + ".the_geom) as the_geom," +
										tableName + ".instanceid";
								if(hasInstanceName) {
									getTaskSql += ", " + tableName + ".instancename";
								}
								getTaskSqlWhere = " from " + tableName + " where " + tableName + "._bad = 'false'";	
								getTaskSqlEnd = ";";
							} else {
								log.info("No geom found");
								// Get a subform that has geometry

								PreparedStatement pstmt2 = connectionSD.prepareStatement(sql);	 
								pstmt2.setInt(1, sId);

								log.info("Get subform with geometry: " + pstmt2.toString());
								ResultSet resultSet2 = pstmt2.executeQuery();

								while (resultSet2.next()) {
									String aTable = resultSet2.getString(1);
									pstmtCheckGeom.setString(1, aTable);
									log.info("Check geom: " + pstmtCheckGeom.toString());
									resultSetGeom = pstmtCheckGeom.executeQuery();
									if(resultSetGeom.next()) {
										if(resultSetGeom.getInt(1) > 0) {
											hasGeom = true;
											tableName2 = aTable;
										}
									}
								}
								pstmt2.close();
								resultSet2.close();
								getTaskSql = "select " + tableName + 
										".prikey, ST_AsText(ST_MakeLine(" + tableName2 + ".the_geom)) as the_geom, " +
										tableName + ".instanceid";
								if(hasInstanceName) {
									getTaskSql += ", " + tableName + ".instancename";
								}

								getTaskSqlWhere = " from " + tableName + " left outer join " + tableName2 + 
										" on " + tableName + ".prikey = " + tableName2 + ".parkey " +
										" where " + tableName + "._bad = 'false'";							
								getTaskSqlEnd = "group by " + tableName + ".prikey ";
							}

							// Finally if we still haven't found a geometry column then set all locations to 0, 0
							if(!hasGeom) {
								log.info("No geometry columns found");

								getTaskSql = "select " + tableName + ".prikey, 'POINT(0 0)' as the_geom, " +
										tableName + ".instanceid";
								if(hasInstanceName) {
									getTaskSql += ", " + tableName + ".instancename";
								}
								getTaskSqlWhere = " from " + tableName + " where " + tableName + "._bad = 'false'";	
								getTaskSqlEnd = ";";

							}


							if(as.address_columns != null) {
								for(int i = 0; i < as.address_columns.size(); i++) {
									TaskAddressSettings add = as.address_columns.get(i);
									if(add.selected) {
										getTaskSql += "," + tableName + "." + add.name;
									}
								}
							}

							/*
							 * Get the source form ident
							 */
							pstmtGetSurveyIdent.setInt(1, as.source_survey_id);
							if(resultSet != null) try {resultSet.close();} catch(Exception e) {};

							log.info("SQL get survey ident: " + pstmt.toString());
							resultSet = pstmtGetSurveyIdent.executeQuery();
							String source_survey_ident = null;
							if(resultSet.next()) {
								source_survey_ident = resultSet.getString(1);
							} else {
								throw new Exception("Form identifier not found for form id: " + as.source_survey_id);
							}
							getTaskSql += getTaskSqlWhere;
							if(filterSql != null && filterSql.trim().length() > 0) {
								getTaskSql += " and " + filterSql;
							}
							getTaskSql += getTaskSqlEnd;

							if(pstmt != null) try {pstmt.close();} catch(Exception e) {};
							pstmt = connectionRel.prepareStatement(getTaskSql);	
							
							//if(frag != null) {
							//	int idx = 1;
							//	idx = GeneralUtilityMethods.setFragParams(pstmt, frag, idx);
							//}
							
							log.info("SQL Get Tasks: ----------------------- " + pstmt.toString());
							resultSet = pstmt.executeQuery();
							while (resultSet.next()) {

								/*
								 * The original URL for instance data only allowed searching via primary key
								 *  the prikey was the last part of the path.
								 *  This use is now deprecated and a more flexible approach is used where the key
								 *  is passed as an attribute.  
								 *  The old path value of primary key is ignored with this new format
								 *  and is set to zero here.
								 */ 
								if(as.update_results /*&& (as.source_survey_id == as.form_id)*/) {
									initial_data_url = "http://" + hostname + "/instanceXML/" + 
											target_survey_ident + "/0?key=prikey&keyval=" + resultSet.getString(1);		// deprecated
									instanceId = resultSet.getString("instanceid");										// New way to identify existing records to be updated
								}

								String location = null;
								log.info("Has geom: " +hasGeom);
								if(hasGeom) {
									location = resultSet.getString("the_geom");
								} 
								String instanceName = null;
								if(hasInstanceName) {
									instanceName = resultSet.getString("instancename");
								}
								if(location == null) {
									location = "POINT(0 0)";
								} else if(location.startsWith("LINESTRING")) {
									log.info("Starts with linestring: " + location.split(" ").length);
									if(location.split(" ").length < 3) {	// Convert to point if there is only one location in the line
										location = location.replaceFirst("LINESTRING", "POINT");
									}
								}	 

								log.info("Location: " + location);

								String geoType = null;
								if(pstmtInsert != null) {pstmtInsert.close();};
								if(location.startsWith("POINT")) {
									pstmtInsert = connectionSD.prepareStatement(insertSql1 + "geo_point," + insertSql2, Statement.RETURN_GENERATED_KEYS);
									geoType = "POINT";
								} else if(location.startsWith("POLYGON")) {
									pstmtInsert = connectionSD.prepareStatement(insertSql1 + "geo_polygon," + insertSql2, Statement.RETURN_GENERATED_KEYS);
									geoType = "POLYGON";
								} else if(location.startsWith("LINESTRING")) {
									pstmtInsert = connectionSD.prepareStatement(insertSql1 + "geo_linestring," + insertSql2, Statement.RETURN_GENERATED_KEYS);
									geoType = "LINESTRING";
								} else {
									log.log(Level.SEVERE, "Unknown location type: " + location);
								}
								pstmtInsert.setInt(1, projectId);
								pstmtInsert.setInt(2, taskGroupId);
								if(instanceName == null || instanceName.trim().length() == 0) {
									pstmtInsert.setString(3, as.project_name + " : " + as.survey_name + " : " + resultSet.getString(1));
								} else {
									pstmtInsert.setString(3, instanceName);
								}
								pstmtInsert.setInt(4, as.target_survey_id);
								pstmtInsert.setString(5, target_survey_url);	
								pstmtInsert.setString(6, geoType);
								pstmtInsert.setString(7, location);
								pstmtInsert.setString(8, initial_data_url);			// Initial data deprecated
								pstmtInsert.setString(9, instanceId);				// Initial data

								/*
								 * Create address JSON string
								 */
								String addressString = null;
								if(as.address_columns != null) {

									addressArray = new ArrayList<TaskAddress> ();
									for(int i = 0; i < as.address_columns.size(); i++) {
										TaskAddressSettings add = as.address_columns.get(i);
										if(add.selected) {
											TaskAddress ta = new TaskAddress();
											ta.name = add.name;
											if(add.isMedia) {
												ta.value = urlprefix + resultSet.getString(add.name);
											} else {
												ta.value = resultSet.getString(add.name);
											}
											addressArray.add(ta);
										}
									}
									gson = new GsonBuilder().disableHtmlEscaping().create();
									addressString = gson.toJson(addressArray); 
								}

								pstmtInsert.setString(10, addressString);			// Address
								pstmtInsert.setString(11, locationTrigger);			// Location that will start task

								log.info("Insert Task: " + pstmtInsert.toString());

								int count = pstmtInsert.executeUpdate();
								if(count != 1) {
									log.info("Error: Failed to insert task");
								} else {
									if(as.user_id > 0) {	// Assign the user to the new task

										keys = pstmtInsert.getGeneratedKeys();
										if(keys.next()) {
											int taskId = keys.getInt(1);

											pstmtAssign.setInt(1, as.user_id);
											pstmtAssign.setString(2, "accepted");
											pstmtAssign.setInt(3, taskId);

											log.info("Assign user to task:" + pstmtAssign.toString());

											pstmtAssign.executeUpdate();
										}
										if(keys != null) try{ keys.close(); } catch(SQLException e) {};


									}
								}
							}

							break;
						} else {
							log.info("parent is:" + p_id + ":");
						}
					}
				}

				/*
				 * Set the tasks from the passed in task list
				 */
				if(as.new_tasks != null) {
					log.info("Creating " + as.new_tasks.features.length + " Ad-Hoc tasks");

					// Assume POINT location, TODO POLYGON, LINESTRING
					if(pstmtInsert != null) {pstmtInsert.close();};
					String geoType = "POINT";
					pstmtInsert = connectionSD.prepareStatement(insertSql1 + "geo_point," + insertSql2, Statement.RETURN_GENERATED_KEYS);

					// Create a dummy location if this task does not have one
					if(as.new_tasks.features.length == 0) {
						Features f = new Features();
						f.geometry = new Geometry();
						f.geometry.coordinates = new String[2];
						f.geometry.coordinates[0] = "0.0";
						f.geometry.coordinates[1] = "0.0";
						as.new_tasks.features = new Features[1];
						as.new_tasks.features[0] = f;
					}
					// Tasks have locations
					for(int i = 0; i < as.new_tasks.features.length; i++) {
						Features f = as.new_tasks.features[i];
						log.info("Creating task at " + f.geometry.coordinates[0] + " : " + f.geometry.coordinates[1]);

						pstmtInsert.setInt(1, projectId);
						pstmtInsert.setInt(2, taskGroupId);
						String title = null;
						if(f.properties != null && f.properties.title != null && !f.properties.title.equals("null")) {
							title = as.project_name + " : " + as.survey_name + " : " + f.properties.title;
						} else {
							title = as.project_name + " : " + as.survey_name;
						}
						pstmtInsert.setString(3, title);
						pstmtInsert.setInt(4, as.target_survey_id);
						pstmtInsert.setString(5, target_survey_url);	
						pstmtInsert.setString(6, "POINT");
						pstmtInsert.setString(7, "POINT(" + f.geometry.coordinates[0] + " " + f.geometry.coordinates[1] + ")");	// The location
						pstmtInsert.setString(8, null);			// Initial data url
						pstmtInsert.setString(9, instanceId);
						pstmtInsert.setString(10, null);		// Address TBD
						pstmtInsert.setString(11, locationTrigger);

						log.info("Insert task: " + pstmtInsert.toString()); 
						int count = pstmtInsert.executeUpdate();
						if(count != 1) {
							log.info("Error: Failed to insert task");
						} else if((f.properties != null && f.properties.userId > 0) || as.user_id > 0) {	// Assign the user to the new task

							keys = pstmtInsert.getGeneratedKeys();
							if(keys.next()) {
								int taskId = keys.getInt(1);

								if(f.properties != null && f.properties.userId > 0) {
									pstmtAssign.setInt(1, f.properties.userId);
									pstmtAssign.setString(2, f.properties.assignment_status);
								} else {
									pstmtAssign.setInt(1, as.user_id);
									pstmtAssign.setString(2, "accepted");
								}

								pstmtAssign.setInt(3, taskId);

								log.info("Assign status: " + pstmtAssign.toString());
								pstmtAssign.executeUpdate();
							}
							if(keys != null) try{ keys.close(); } catch(SQLException e) {};

						}
					}

				}
				
				// Create a notification for the updated user
				if(as.user_id > 0) {
					String userIdent = GeneralUtilityMethods.getUserIdent(connectionSD, as.user_id);
					MessagingManager mm = new MessagingManager();
					mm.userChange(connectionSD, userIdent);
				}
			}
			connectionSD.commit();

			log.info("Returning task group id:" + taskGroupId);
			response = Response.ok().entity("{\"tg_id\": " + taskGroupId + "}").build();

		} catch (Exception e) {
			log.info("Error: " + e.getMessage());
			if(e.getMessage() != null && e.getMessage().contains("\"the_geom\" does not exist")) {
				String msg = "The survey results do not have coordinates " + as.source_survey_name;
				response = Response.status(Status.NO_CONTENT).entity(msg).build();
			} else if(e.getMessage() != null && e.getMessage().contains("does not exist")) {
				response = Response.ok("{\"tg_id\": 0}").build();	// No problem
			} else {
				response = Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
				log.log(Level.SEVERE,"", e);
			}	

			try { connectionSD.rollback();} catch (Exception ex){log.log(Level.SEVERE,"", ex);}

		} finally {

			if(pstmt != null) try {	pstmt.close(); } catch(SQLException e) {};
			if(pstmtInsert != null) try {	pstmtInsert.close(); } catch(SQLException e) {};
			if(pstmtAssign != null) try {	pstmtAssign.close(); } catch(SQLException e) {};
			if(pstmtTaskGroup != null) try {	pstmtTaskGroup.close(); } catch(SQLException e) {};
			if(pstmtGetSurveyIdent != null) try {	pstmtGetSurveyIdent.close(); } catch(SQLException e) {};
			if(pstmtUniqueTg != null) try {	pstmtUniqueTg.close(); } catch(SQLException e) {};

			SDDataSource.closeConnection("surveyKPI-AllAssignments", connectionSD);
			ResultsDataSource.closeConnection("surveyKPI-AllAssignments", connectionRel);

		}

		return response;
	}

	/*
	 * Update the task assignment
	 */
	@POST
	public Response updateAssignmentStatus(@Context HttpServletRequest request, 
			@FormParam("settings") String settings) { 

		Response response = null;

		log.info("Assignment:" + settings);
		Type type = new TypeToken<ArrayList<Assignment>>(){}.getType();		
		ArrayList<Assignment> aArray = new Gson().fromJson(settings, type);

		String userName = request.getRemoteUser();	

		// Authorisation - Access
		Connection connectionSD = SDDataSource.getConnection("surveyKPI-AllAssignments");
		a.isAuthorised(connectionSD, request.getRemoteUser());
		for(int i = 0; i < aArray.size(); i++) {

			Assignment ass = aArray.get(i);

			if(ass.assignment_id == 0) {	// New assignment
				a.isValidTask(connectionSD, request.getRemoteUser(), ass.task_id);
			} else {	// update existing assignment
				a.isValidAssignment(connectionSD, request.getRemoteUser(), ass.assignment_id);
			}

		}
		// End Authorisation

		PreparedStatement pstmtInsert = null;
		PreparedStatement pstmtUpdate = null;
		PreparedStatement pstmtDelete = null;
		String insertSQL = "insert into assignments (assignee, status, task_id) values (?, ?, ?);";
		String updateSQL = "update assignments set " +
				"assignee = ?," +
				"status = ? " +
				"where id = ?;";
		String deleteSQL = "delete from assignments where id = ?;";

		try {
			pstmtInsert = connectionSD.prepareStatement(insertSQL);
			pstmtUpdate = connectionSD.prepareStatement(updateSQL);
			pstmtDelete = connectionSD.prepareStatement(deleteSQL);
			log.info("Set autocommit sd false");
			connectionSD.setAutoCommit(false);

			for(int i = 0; i < aArray.size(); i++) {

				Assignment a = aArray.get(i);

				if(a.assignment_id == 0) {	// New assignment
					pstmtInsert.setInt(1,a.user.id);
					pstmtInsert.setString(2, a.assignment_status);
					pstmtInsert.setInt(3, a.task_id);
					log.info("Add new assignment: " + pstmtInsert.toString());
					pstmtInsert.executeUpdate();
				} else if(a.user.id >= 0) {	// update existing assignment
					pstmtUpdate.setInt(1,a.user.id);
					pstmtUpdate.setString(2, a.assignment_status);
					pstmtUpdate.setInt(3, a.assignment_id);
					log.info("Update existing assignment: " + pstmtUpdate.toString());
					pstmtUpdate.executeUpdate();
				} else {		// delete the assignment
					pstmtDelete.setInt(1, a.assignment_id);
					log.info("Delete existing assignment: " + pstmtDelete.toString());
					pstmtDelete.executeUpdate();
				}

			}
			connectionSD.commit();

		} catch (Exception e) {
			response = Response.serverError().build();
			log.log(Level.SEVERE,"", e);

			try { connectionSD.rollback();} catch (Exception ex){log.log(Level.SEVERE,"", ex);}

		} finally {
			try {if (pstmtUpdate != null) {pstmtUpdate.close();}} catch (SQLException e) {}
			try {if (pstmtInsert != null) {pstmtInsert.close();}} catch (SQLException e) {}
			try {if (pstmtDelete != null) {pstmtDelete.close();}} catch (SQLException e) {}

			SDDataSource.closeConnection("surveyKPI-AllAssignments", connectionSD);
		}

		return response;
	}



	/*
	 * Load tasks, that is survey results, from:
	 *   1) a CSV file
	 *   2) an XLSX file
	 *   3) a ZIP file containing a CSV file and images
	 *   4) a ZIP file containing an XLSX file and images
	 */
	@POST
	@Path("/load")
	public Response loadResultsFromFile(@Context HttpServletRequest request) { 

		Response response = null;

		log.info("Load results from file");

		// Authorisation - Access
		Connection sd = SDDataSource.getConnection("surveyKPI-AllAssignments-LoadTasks From File");
		a.isAuthorised(sd, request.getRemoteUser());
		// End role based authorisation - Check access to the requested survey once the survey id has been extracted

		DiskFileItemFactory  fileItemFactory = new DiskFileItemFactory ();	
		fileItemFactory.setSizeThreshold(20*1024*1024); // 20 MB TODO handle this with exception and redirect to an error page
		ServletFileUpload uploadHandler = new ServletFileUpload(fileItemFactory);

		// SQL to get a column name from the survey
		String sqlGetCol = "select q_id, qname, column_name, qtype "
				+ "from question "
				+ "where f_id = ? "
				+ "and lower(qname) = ? "
				+ "and source is not null "
				+ "and not soft_deleted";
		PreparedStatement pstmtGetCol = null;

		// SQL to get choices for a select question
		String sqlGetChoices = "select o.ovalue, o.column_name from option o, question q where q.q_id = ? and o.l_id = q.l_id";
		PreparedStatement pstmtGetChoices = null;

		PreparedStatement pstmtDeleteExisting = null;

		String uploadedFileName = null;
		String fileName = null;
		String filePath = null;
		File savedFile = null;									// The uploaded file
		ArrayList<File> dataFiles = new ArrayList<File> ();		// Uploaded data files - There may be multiple of these in a zip file
		HashMap<String, String> formFile = new HashMap<String, String> ();	// Mapping between form and the file that contains the data to populate it
		String contentType = null;
		int sId = 0;
		String sIdent = null;		// Survey Ident
		String sName = null;		// Survey Name
		boolean clear_existing = false;
		HashMap<String, File> mediaFiles = new HashMap<String, File> ();
		HashMap<String, File> formFileMap = null;
		ArrayList<String> responseMsg = new ArrayList<String> ();
		int recordsWritten = 0;

		Connection results = ResultsDataSource.getConnection("surveyKPI-AllAssignments-LoadTasks From File");
		boolean superUser = false;
		try {

			// Get the users locale
			Locale locale = new Locale(GeneralUtilityMethods.getUserLanguage(sd, request.getRemoteUser()));
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);

			// Get the base path
			String basePath = GeneralUtilityMethods.getBasePath(request);

			// Get the items from the multi part mime
			List<?> items = uploadHandler.parseRequest(request);
			Iterator<?> itr = items.iterator();
			while(itr.hasNext()) {
				FileItem item = (FileItem) itr.next();

				if(item.isFormField()) {
					log.info("Form field:" + item.getFieldName() + " - " + item.getString());

					if(item.getFieldName().equals("survey")) {
						sId = Integer.parseInt(item.getString());
						try {
							superUser = GeneralUtilityMethods.isSuperUser(sd, request.getRemoteUser());
						} catch (Exception e) {
						}
						a.isValidSurvey(sd, request.getRemoteUser(), sId, false, superUser);
						a.canLoadTasks(sd, sId);

						sIdent = GeneralUtilityMethods.getSurveyIdent(sd, sId);
						sName = GeneralUtilityMethods.getSurveyName(sd, sId);
					} else if(item.getFieldName().equals("clear_existing")) {
						clear_existing = true;
					}


				} else if(!item.isFormField()) {
					// Handle Uploaded file
					log.info("Field Name = "+item.getFieldName()+
							", File Name = "+item.getName()+
							", Content type = "+item.getContentType()+
							", File Size = "+item.getSize());

					uploadedFileName = item.getName();

					if(item.getSize() > 0) {
						contentType = item.getContentType();

						String ext = "";
						if(contentType.contains("zip")) {
							ext = ".zip";
						} else if(contentType.contains("csv")) {
							ext = ".csv";
						} else {
							ext = ".xlsx";
						}
						fileName = String.valueOf(UUID.randomUUID()) + ext;

						filePath = basePath + "/temp/" + fileName;
						savedFile = new File(filePath);
						item.write(savedFile);
					}					
				}

			}
			log.info("Content Type: " + contentType);
			if(contentType == null) {
				throw new Exception("Missing file");
			}

			/*
			 * Get the forms for this survey 
			 */
			ExchangeManager xm = new ExchangeManager();
			ArrayList <FormDesc> formList = xm.getFormList(sd, sId);		

			pstmtGetCol = sd.prepareStatement(sqlGetCol);  			// Prepare the statement to get the column names in the survey that are to be updated
			pstmtGetChoices = sd.prepareStatement(sqlGetChoices);  // Prepare the statement to get select choices

			// If this is a zip file extract the contents and set the path to the expanded data file that should be inside
			// Refer to http://www.mkyong.com/java/how-to-decompress-files-from-a-zip-file/
			if(savedFile.getName().endsWith(".zip")) {
				String zipFolderPath = savedFile.getAbsolutePath() + ".dir";
				File zipFolder = new File(zipFolderPath);
				if(!zipFolder.exists()) {
					zipFolder.mkdir();
				}
				ZipInputStream zis = new ZipInputStream(new FileInputStream(savedFile));
				ZipEntry ze = null;
				byte[] buffer = new byte[1024];
				while((ze = zis.getNextEntry()) != null) {
					String zFileName = ze.getName();
					if(!zFileName.startsWith("__MAC")) {	// Files added by macintosh zip utility

						log.info("File in zip: " + ze.getName());
						File zFile = new File(zipFolderPath + File.separator + zFileName);

						new File(zFile.getParent()).mkdirs();	// Make sure path is complete 

						if(ze.isDirectory()) {
							zFile.mkdir();
						} else {
							if((zFileName.endsWith(".csv") || zFileName.endsWith(".xlsx")) && !zFileName.startsWith("~$")) {
								// Data file
								dataFiles.add(zFile);
							} else {
								// Media File. Save the filename and File for processing with each record of data
								// Remove the path from the filename - every file in the zip file must have a unique name
								int idx = zFileName.lastIndexOf('/');
								if(idx > 0) {
									zFileName = zFileName.substring(idx + 1);
								}
								mediaFiles.put(zFileName, zFile);
							}

							// Write the file
							FileOutputStream fos = new FileOutputStream(zFile);
							int len;
							while ((len = zis.read(buffer)) > 0) {
								fos.write(buffer, 0, len);
							}
							fos.close();
						}
					}
					zis.closeEntry();
				}
				zis.close();
			} else {
				dataFiles.add(savedFile);
			} 


			/*
			 * Get a mapping between form name and file name
			 * We need this as the data will need to be applied from parent form to child form in order rather than
			 *  in file order
			 */
			formFileMap = getFormFileMap(xm, dataFiles, formList);

			/*
			 * Create the results tables if they do not exist
			 */
			TableManager tm = new TableManager(localisation);
			FormDesc topForm = formList.get(0);
			boolean tableCreated = tm.createTable(results, sd, topForm.table_name, sIdent, sId, 0);
			boolean tableChanged = false;
			boolean tablePublished = false;

			// Apply any updates that have been made to the table structure since the last submission
			if(!tableCreated) {
				tableChanged = tm.applyTableChanges(sd, results, sId);

				// Add any previously unpublished columns not in a changeset (Occurs if this is a new survey sharing an existing table)
				tablePublished = tm.addUnpublishedColumns(sd, results, sId);			
				if(tableChanged || tablePublished) {
					tm.markPublished(sd, sId);		// only mark published if there have been changes made
				}
			}

			/*
			 * Delete the existing data if requested
			 */
			results.setAutoCommit(false);
			if(clear_existing) {
				for(int i = 0; i < formList.size(); i++) {

					String sqlDeleteExisting = "truncate " + formList.get(i).table_name + ";";
					if(pstmtDeleteExisting != null) try {pstmtDeleteExisting.close();} catch(Exception e) {}
					pstmtDeleteExisting = results.prepareStatement(sqlDeleteExisting);

					log.info("Clearing results: " + pstmtDeleteExisting.toString());
					pstmtDeleteExisting.executeUpdate();
				}
			}

			/*
			 * Process the data files
			 *   Identify forms
			 *   Identify columns in forms
			 */
			for(int formIdx = 0; formIdx < formList.size(); formIdx++) {

				FormDesc formDesc = formList.get(formIdx);

				File f = formFileMap.get(formDesc.name);

				if(f != null) {
					boolean isCSV = false;
					if(f.getName().endsWith(".csv")) {
						isCSV = true;
					}

					int count = xm.loadFormDataFromFile(results, 
							pstmtGetCol, 
							pstmtGetChoices, 
							f, 
							formDesc, 
							sIdent,
							mediaFiles,
							isCSV,
							responseMsg,
							basePath,
							localisation);

					if(formIdx == 0) {
						recordsWritten = count;
					}

				} else {
					responseMsg.add(localisation.getString("imp_no_file") + ": " + formDesc.name);
					log.info("No file of data for form: " + formDesc.name);
				}
			}				

			results.commit();

			StringBuffer logMessage = new StringBuffer("");
			logMessage.append(recordsWritten);
			logMessage.append(" "); 
			logMessage.append(localisation.getString("imp_frm"));
			logMessage.append(" "); 
			logMessage.append(uploadedFileName);
			logMessage.append(" "); 
			logMessage.append(localisation.getString("imp_fs"));
			logMessage.append(" "); 
			logMessage.append(sName);
			logMessage.append(" "); 
			logMessage.append(localisation.getString("imp_pr"));
			logMessage.append(" "); 
			logMessage.append((clear_existing ? localisation.getString("imp_del") : localisation.getString("imp_pres")));

			lm.writeLog(sd, sId, request.getRemoteUser(), "import data", logMessage.toString());
			log.info("userevent: " + request.getRemoteUser() + " : loading file into survey: " + sId + " Previous contents are" + (clear_existing ? " deleted" : " preserved"));  // Write user event in english only

			Gson gson = new GsonBuilder().disableHtmlEscaping().create();

			responseMsg.add(localisation.getString("imp_c"));
			response = Response.status(Status.OK).entity(gson.toJson(responseMsg)).build();

		} catch (AuthorisationException e) {
			log.log(Level.SEVERE,"", e);
			try { results.rollback();} catch (Exception ex){}
			response = Response.status(Status.FORBIDDEN).entity("Cannot load tasks from a file to this form. You need to enable loading tasks for this form in the form settings in the editor page.").build();

		} catch (NotFoundException e) {
			log.log(Level.SEVERE,"", e);
			try { results.rollback();} catch (Exception ex){}
			throw new NotFoundException();

		} catch (Exception e) {
			String msg = e.getMessage();
			if(msg != null && msg.startsWith("org.postgresql.util.PSQLException: Zero bytes")) {
				msg = "Invalid file format. Only zip and csv files accepted";
				log.info("Error: " + msg + " : " + e.getMessage());
			} else {
				log.log(Level.SEVERE,"", e);
			}
			response = Response.status(Status.INTERNAL_SERVER_ERROR).entity(msg).build();
			try { results.rollback();} catch (Exception ex){}


		} finally {
			try {if (pstmtGetCol != null) {pstmtGetCol.close();}} catch (SQLException e) {}
			try {if (pstmtGetChoices != null) {pstmtGetChoices.close();}} catch (SQLException e) {}
			try {if (pstmtDeleteExisting != null) {pstmtDeleteExisting.close();}} catch (SQLException e) {}

			try {results.setAutoCommit(true);} catch (SQLException e) {}

			try {
				SDDataSource.closeConnection("surveyKPI-AllAssignments-LoadTasks From File", sd);
			} catch(Exception e) {};
			try {
				ResultsDataSource.closeConnection("surveyKPI-AllAssignments-LoadTasks From File", results);
			} catch(Exception e) {};
		}

		return response;
	}

	/*
	 * Update the task properties
	 * Keep in version 16.04+
	 */
	@POST
	@Path("/properties")
	public Response updateTaskProperties(@Context HttpServletRequest request) { 

		Response response = null;
		String dbConnectionTitle = "surveyKPI-AllAssignments- Update task properties";

		log.info("Updating task properties");	

		// Authorisation - Access
		Connection connectionSD = SDDataSource.getConnection(dbConnectionTitle);
		a.isAuthorised(connectionSD, request.getRemoteUser());
		// End role based authorisation - Check access to the requested survey once the survey id has been extracted

		DiskFileItemFactory  fileItemFactory = new DiskFileItemFactory ();	
		fileItemFactory.setSizeThreshold(20*1024*1024); // 20 MB TODO handle this with exception and redirect to an error page
		ServletFileUpload uploadHandler = new ServletFileUpload(fileItemFactory);

		PreparedStatement pstmtUpdate = null;


		int taskId = 0;
		String taskTitle = null;
		boolean repeat = false;
		Timestamp scheduleAt = null;
		String locationTrigger = null;
		Calendar cal = Calendar.getInstance(); 


		try {

			// Get the items from the multi part mime
			List<?> items = uploadHandler.parseRequest(request);
			Iterator<?> itr = items.iterator();
			while(itr.hasNext()) {
				FileItem item = (FileItem) itr.next();

				if(item.isFormField()) {
					log.info("Form field:" + item.getFieldName() + " - " + item.getString());

					if(item.getFieldName().equals("taskid")) {
						taskId = Integer.parseInt(item.getString());	
					} if(item.getFieldName().equals("taskTitle")) {
						taskTitle = item.getString();	
					} else if(item.getFieldName().equals("repeat")) {
						repeat = true;	
					} else if(item.getFieldName().equals("scheduleAtUTC")) {
						scheduleAt = Timestamp.valueOf(item.getString());	
					} else if(item.getFieldName().equals("location_trigger")) {
						locationTrigger = item.getString();	
						if(locationTrigger != null && locationTrigger.equals("-1")) {
							locationTrigger = null;
						}
					}

				} else if(!item.isFormField()) {
					// Handle Uploaded file
					log.info("Field Name = "+item.getFieldName()+
							", File Name = "+item.getName()+
							", Content type = "+item.getContentType()+
							", File Size = "+item.getSize());		
				}

			}

			String sqlUpdate = "update tasks set repeat = ?, schedule_at = ?, location_trigger = ?,  title = ? where id = ?;";
			pstmtUpdate = connectionSD.prepareStatement(sqlUpdate);
			pstmtUpdate.setBoolean(1, repeat);
			pstmtUpdate.setTimestamp(2, scheduleAt);
			pstmtUpdate.setString(3, locationTrigger);
			pstmtUpdate.setString(4, taskTitle);
			pstmtUpdate.setInt(5, taskId);

			log.info("SQL Update properties: " + pstmtUpdate.toString());
			pstmtUpdate.executeUpdate();

		} catch (AuthorisationException e) {
			log.log(Level.SEVERE,"", e);
			response = Response.status(Status.FORBIDDEN).entity("Cannot update properties for this task").build();

		} catch (NotFoundException e) {
			log.log(Level.SEVERE,"", e);
			throw new NotFoundException();

		} catch (Exception e) {
			response = Response.status(Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();

			log.log(Level.SEVERE,"", e);

		} finally {
			try {if (pstmtUpdate != null) {pstmtUpdate.close();}} catch (SQLException e) {}
			SDDataSource.closeConnection(dbConnectionTitle, connectionSD);

		}

		return response;
	}



	/*
	 * Delete tasks
	 */
	@DELETE
	public Response deleteTasks(@Context HttpServletRequest request,
			@FormParam("settings") String settings) { 

		Response response = null;

		log.info("Assignment:" + settings);
		Type type = new TypeToken<ArrayList<Assignment>>(){}.getType();		
		ArrayList<Assignment> aArray = new Gson().fromJson(settings, type);

		// Authorisation - Access
		Connection connectionSD = SDDataSource.getConnection("surveyKPI-AllAssignments");
		a.isAuthorised(connectionSD, request.getRemoteUser());
		for(int i = 0; i < aArray.size(); i++) {

			Assignment ass = aArray.get(i);		
			a.isValidTask(connectionSD, request.getRemoteUser(), ass.task_id);

		}
		// End Authorisation

		PreparedStatement pstmtCount = null;
		PreparedStatement pstmtUpdate = null;
		PreparedStatement pstmtDelete = null;
		PreparedStatement pstmtDeleteEmptyGroup = null;

		try {
			//connectionSD.setAutoCommit(false);
			//String countSQL = "select count(*) from tasks t, assignments a " +
			//		"where t.id = a.task_id " +
			//		"and t.id = ?";
			//pstmtCount = connectionSD.prepareStatement(countSQL);

			//String updateSQL = "update assignments set status = 'cancelled' where task_id = ? " +
			//		"and (status = 'new' " +
			//		"or status = 'accepted' " + 
			//		"or status = 'pending'); "; 
			//pstmtUpdate = connectionSD.prepareStatement(updateSQL);

			String deleteSQL = "delete from tasks where id = ?; "; 
			pstmtDelete = connectionSD.prepareStatement(deleteSQL);

			//String deleteEmptyGroupSQL = "delete from task_group tg where not exists (select 1 from tasks t where t.tg_id = tg.tg_id);";
			//pstmtDeleteEmptyGroup = connectionSD.prepareStatement(deleteEmptyGroupSQL);

			for(int i = 0; i < aArray.size(); i++) {

				Assignment a = aArray.get(i);

				// Check to see if the task has any assignments
				//pstmtCount.setInt(1, a.task_id);
				//ResultSet rs = pstmtCount.executeQuery();
				//int countAss = 0;
				//if(rs.next()) {
				//	countAss = rs.getInt(1);
				//}

				//if(countAss > 0) {
				//	log.info(updateSQL + " : " + a.task_id);
				//	pstmtUpdate.setInt(1, a.task_id);
				//	pstmtUpdate.execute();
				//} else {

				pstmtDelete.setInt(1, a.task_id);
				log.info("SQL: " + pstmtDelete.toString());
				pstmtDelete.execute();
				//}
			}

			// Delete any task groups that have no tasks
			//pstmtDeleteEmptyGroup.execute();
			//connectionSD.commit();

		} catch (Exception e) {
			response = Response.serverError().build();
			log.log(Level.SEVERE,"", e);

			try { connectionSD.rollback();} catch (Exception ex){log.log(Level.SEVERE,"", ex);}

		} finally {
			if (pstmtCount != null) try {pstmtCount.close();} catch (SQLException e) {};
			if (pstmtUpdate != null) try {pstmtUpdate.close();} catch (SQLException e) {};
			if (pstmtDelete != null) try {pstmtDelete.close();} catch (SQLException e) {};
			if (pstmtDeleteEmptyGroup != null) try {pstmtDeleteEmptyGroup.close();} catch (SQLException e) {};

			SDDataSource.closeConnection("surveyKPI-AllAssignments", connectionSD);
		}

		return response;
	}

	/*
	 * Delete task group
	 * This web service takes no account of tasks that have already been assigned
	 */
	@DELETE
	@Path("/{taskGroupId}")
	public Response deleteTaskGroup(@Context HttpServletRequest request,
			@PathParam("taskGroupId") int tg_id) { 

		Response response = null;

		// Authorisation - Access
		Connection connectionSD = SDDataSource.getConnection("surveyKPI-AllAssignments");
		a.isAuthorised(connectionSD, request.getRemoteUser());
		// End Authorisation

		PreparedStatement pstmtDelete = null;

		try {

			TaskManager tm = new TaskManager();
			tm.deleteTasksInTaskGroup(connectionSD, tg_id);		// Note can't rely on cascading delete as temporary users need to be deleted
			String deleteSQL = "delete from task_group where tg_id = ?; "; 
			pstmtDelete = connectionSD.prepareStatement(deleteSQL);

			pstmtDelete.setInt(1, tg_id);
			log.info("SQL: " + pstmtDelete.toString());
			pstmtDelete.execute();


		} catch (Exception e) {
			response = Response.serverError().build();
			log.log(Level.SEVERE,"", e);

			try { connectionSD.rollback();} catch (Exception ex){log.log(Level.SEVERE,"", ex);}

		} finally {

			if (pstmtDelete != null) try {pstmtDelete.close();} catch (SQLException e) {};

			SDDataSource.closeConnection("surveyKPI-AllAssignments", connectionSD);
		}

		return response;
	}

	/*
	 * Mark cancelled tasks as deleted
	 * This may be required if tasks are allocated to a user who never updates them
	 */
	@Path("/cancelled/{projectId}")
	@DELETE
	public Response forceRemoveCancelledTasks(@Context HttpServletRequest request,
			@PathParam("projectId") int projectId
			) { 

		Response response = null;

		// Authorisation - Access
		Connection connectionSD = SDDataSource.getConnection("surveyKPI-AllAssignments");
		a.isAuthorised(connectionSD, request.getRemoteUser());
		a.isValidProject(connectionSD, request.getRemoteUser(), projectId);
		// End Authorisation

		PreparedStatement pstmtDelete = null;

		try {

			String deleteSQL = "delete from tasks t " +
					" where t.p_id = ? " +
					" and t.id in (select task_id from assignments a " +
					" where a.status = 'cancelled' or a.status = 'rejected'); "; 

			pstmtDelete = connectionSD.prepareStatement(deleteSQL);

			log.info(deleteSQL + " : " + projectId);
			pstmtDelete.setInt(1, projectId);
			pstmtDelete.execute();


		} catch (Exception e) {
			response = Response.serverError().build();
			log.log(Level.SEVERE,"", e);
			try {
				connectionSD.rollback();
			} catch (Exception ex) {

			}
		} finally {
			if (pstmtDelete != null) try {pstmtDelete.close();} catch (SQLException e) {};

			SDDataSource.closeConnection("surveyKPI-AllAssignments", connectionSD);
		}

		return response;
	}


	private HashMap<String, File> getFormFileMap(ExchangeManager xm, ArrayList<File> files, ArrayList<FormDesc> forms) throws Exception {
		HashMap<String, File> formFileMap = new HashMap<String, File> ();

		/*
		 * If there is only one csv file then associate it with the main form
		 * This is to ensure backward compatability for versions prior to 16.12 which only allowed a single data file of any name to load the main form
		 */
		boolean allDone = false;
		if(files.size() == 1) {
			File file = files.get(0);
			if(file.getName().endsWith(".csv")) {
				formFileMap.put("main", file);
				allDone = true;
			}
		}

		/*
		 * Otherwise associate forms with files
		 */
		if(!allDone) {
			for(int i = 0; i < files.size(); i++) {
				File file = files.get(i);
				String filename = file.getName();

				if(filename.endsWith(".csv")) {
					int idx = filename.lastIndexOf('.');
					String formName = filename.substring(0, idx);
					formFileMap.put(formName, file);
				} else {
					FileInputStream fis = new FileInputStream(file);
					ArrayList<String> formNames = xm.getFormsFromXLSX(fis);
					for(int j = 0; j < formNames.size(); j++) {
						formFileMap.put(formNames.get(j), file);
					}
				}
			}
		}
		return formFileMap;
	}
}



